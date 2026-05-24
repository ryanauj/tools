const API = "https://api.github.com";
const TOKEN_KEY = "repo-creator:token";
const OWNER_KEY = "repo-creator:owner";

const $ = (sel) => document.querySelector(sel);

const els = {
  token: $("#token"),
  remember: $("#remember-token"),
  verifyBtn: $("#verify-btn"),
  tokenStatus: $("#token-status"),
  owner: $("#owner"),
  name: $("#name"),
  description: $("#description"),
  template: $("#template"),
  gitignore: $("#gitignore"),
  license: $("#license"),
  reviews: $("#reviews"),
  dismissStale: $("#dismiss-stale"),
  requireCodeowner: $("#require-codeowner"),
  requireLastPush: $("#require-last-push"),
  blockForcePush: $("#block-force-push"),
  blockDeletion: $("#block-deletion"),
  adminBypass: $("#admin-bypass"),
  createBtn: $("#create-btn"),
  createStatus: $("#create-status"),
  logPanel: $("#log-panel"),
  log: $("#log"),
  result: $("#result"),
};

let viewer = null; // { login, id, type } once verified

restore();

els.verifyBtn.addEventListener("click", verifyToken);
els.createBtn.addEventListener("click", createRepo);
els.token.addEventListener("input", () => {
  viewer = null;
  setStatus(els.tokenStatus, "Not verified.", "");
});
els.remember.addEventListener("change", () => {
  if (!els.remember.checked) localStorage.removeItem(TOKEN_KEY);
  else if (els.token.value) localStorage.setItem(TOKEN_KEY, els.token.value);
});
els.owner.addEventListener("change", () => {
  if (els.owner.value) localStorage.setItem(OWNER_KEY, els.owner.value);
});

function restore() {
  const saved = localStorage.getItem(TOKEN_KEY);
  if (saved) {
    els.token.value = saved;
    els.remember.checked = true;
  }
  const savedOwner = localStorage.getItem(OWNER_KEY);
  if (savedOwner) els.owner.value = savedOwner;
}

function setStatus(el, msg, kind = "") {
  el.textContent = msg;
  el.className = "status" + (kind ? " " + kind : "");
}

async function gh(path, { method = "GET", body, token } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Authorization": `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const msg = (data && data.message) || res.statusText || `HTTP ${res.status}`;
    const errors = data && data.errors ? ": " + JSON.stringify(data.errors) : "";
    const err = new Error(`${msg}${errors}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function verifyToken() {
  const token = els.token.value.trim();
  if (!token) {
    setStatus(els.tokenStatus, "Enter a token first.", "err");
    return;
  }
  setStatus(els.tokenStatus, "Checking…", "working");
  try {
    const user = await gh("/user", { token });
    viewer = { login: user.login, id: user.id, type: user.type };
    setStatus(els.tokenStatus, `Authenticated as ${user.login} (id ${user.id}).`, "ok");
    if (!els.owner.value) els.owner.value = user.login;
    if (els.remember.checked) localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    viewer = null;
    setStatus(els.tokenStatus, `Failed: ${e.message}`, "err");
  }
}

function addLog(msg, kind = "") {
  const li = document.createElement("li");
  if (kind) li.className = kind;
  li.textContent = msg;
  els.log.appendChild(li);
  return li;
}

async function createRepo() {
  const token = els.token.value.trim();
  const owner = els.owner.value.trim();
  const name = els.name.value.trim();
  if (!token) return setStatus(els.createStatus, "Token required.", "err");
  if (!owner) return setStatus(els.createStatus, "Owner required.", "err");
  if (!name) return setStatus(els.createStatus, "Repo name required.", "err");
  if (!viewer) {
    setStatus(els.createStatus, "Verifying token first…", "working");
    await verifyToken();
    if (!viewer) return setStatus(els.createStatus, "Token verification failed.", "err");
  }

  els.logPanel.hidden = false;
  els.log.innerHTML = "";
  els.result.hidden = true;
  els.createBtn.disabled = true;
  setStatus(els.createStatus, "Working…", "working");

  const visibility = document.querySelector('input[name="visibility"]:checked').value;
  const isOrg = owner.toLowerCase() !== viewer.login.toLowerCase();
  const template = els.template.value;
  const autoInit = template !== "empty";

  const body = {
    name,
    description: els.description.value.trim() || undefined,
    private: visibility === "private",
    auto_init: autoInit,
    gitignore_template: autoInit && els.gitignore.value.trim() ? els.gitignore.value.trim() : undefined,
    license_template: autoInit && els.license.value.trim() ? els.license.value.trim().toLowerCase() : undefined,
  };

  const path = isOrg ? `/orgs/${encodeURIComponent(owner)}/repos` : "/user/repos";
  const repoLog = addLog(`Creating ${visibility} repo ${owner}/${name}…`, "working");
  let repo;
  try {
    repo = await gh(path, { method: "POST", body, token });
    repoLog.textContent = `Created ${repo.full_name} → ${repo.html_url}`;
    repoLog.className = "ok";
  } catch (e) {
    repoLog.textContent = `Failed to create repo: ${e.message}`;
    repoLog.className = "err";
    setStatus(els.createStatus, "Failed.", "err");
    els.createBtn.disabled = false;
    return;
  }

  let rulesetUrl = null;
  if (!autoInit) {
    addLog("Skipped ruleset — repo is empty, default branch doesn't exist yet. Push a first commit, then re-run for ruleset setup.", "skip");
  } else {
    const rulesetLog = addLog("Creating branch protection ruleset on default branch…", "working");
    try {
      const ruleset = await createRuleset(token, repo.owner.login, repo.name);
      rulesetLog.textContent = `Ruleset "${ruleset.name}" applied (id ${ruleset.id}).`;
      rulesetLog.className = "ok";
      rulesetUrl = `${repo.html_url}/rules/${ruleset.id}`;
    } catch (e) {
      rulesetLog.textContent = `Ruleset failed: ${e.message}`;
      rulesetLog.className = "err";
    }
  }

  setStatus(els.createStatus, "Done.", "ok");
  els.result.hidden = false;
  els.result.innerHTML = `
    <div>Repository: <a href="${repo.html_url}" target="_blank" rel="noreferrer">${repo.html_url}</a></div>
    <div>Clone: <code>${repo.clone_url}</code></div>
    ${rulesetUrl ? `<div>Ruleset: <a href="${rulesetUrl}" target="_blank" rel="noreferrer">${rulesetUrl}</a></div>` : ""}
  `;
  els.createBtn.disabled = false;
}

async function createRuleset(token, owner, repo) {
  const reviewCount = Math.max(0, parseInt(els.reviews.value, 10) || 0);

  const rules = [];
  if (reviewCount > 0 || els.requireCodeowner.checked || els.requireLastPush.checked) {
    rules.push({
      type: "pull_request",
      parameters: {
        required_approving_review_count: reviewCount,
        dismiss_stale_reviews_on_push: els.dismissStale.checked,
        require_code_owner_review: els.requireCodeowner.checked,
        require_last_push_approval: els.requireLastPush.checked,
        required_review_thread_resolution: false,
      },
    });
  }
  if (els.blockForcePush.checked) rules.push({ type: "non_fast_forward" });
  if (els.blockDeletion.checked) rules.push({ type: "deletion" });

  const bypass_actors = [];
  if (els.adminBypass.checked) {
    // Repository "Admin" base role has id 5. Adding it as a bypass actor lets
    // any admin (the owner) push or merge without going through the ruleset.
    bypass_actors.push({ actor_id: 5, actor_type: "RepositoryRole", bypass_mode: "always" });
  }

  const body = {
    name: "default-branch protection",
    target: "branch",
    enforcement: "active",
    bypass_actors,
    conditions: {
      ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] },
    },
    rules,
  };

  return gh(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/rulesets`, {
    method: "POST",
    body,
    token,
  });
}
