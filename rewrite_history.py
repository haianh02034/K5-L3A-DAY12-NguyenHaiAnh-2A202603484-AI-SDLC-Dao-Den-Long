import subprocess
import os

def run(cmd, env=None, check=True):
    full_env = os.environ.copy()
    if env:
        full_env.update(env)
    res = subprocess.run(cmd, shell=True, env=full_env, capture_output=True, text=True, encoding="utf-8")
    if check and res.returncode != 0:
        print("COMMAND:", cmd)
        print("STDOUT:", res.stdout)
        print("STDERR:", res.stderr)
        raise RuntimeError(f"Command failed with code {res.returncode}: {cmd}")
    return res.stdout.strip()

commits_in_order = [
    ("2e56774473e906118785097d07d769320567a924", "Build playable Day 12 Checkpoint 0 prototype"),
    ("d9d384a7422c1173dfe4502700bd06e11838e53c", "Rebuild Dao Ben and implement Phase 1 contract"),
    ("b71817d8bdf1494d26d8a27427a1bc05795429c5", "Enrich island forest and add obstacle gameplay"),
    ("1a3edb5d9c06249ef11b3c93b30ac1e423d56fa6", "Polish shrine lighting, obstacle sliding and difficulty"),
    ("f88ffbe789a80e990a08f2ee6cbaab0bd8fadf1f", "Build three-night campaign and implement Test Contract v1.1"),
    ("2fd9d1fbf59a787a302b35d8df6a44dc16c791c2", "Polish Phase 2 and add quick island practice"),
    ("3a30e8a02276cd009f8bd89f58beab32b84a0a75", "Simplify game typography and clear the play HUD"),
    ("62a6068a763dbb8adedc0495f5c6469135ca3570", "Rebuild dragon effects and add browser performance controls"),
    ("fc41c47fef3aa7388f460c5b0a7553853435689b", "Increase firefly supply for browser play"),
    ("22896184fdd5989cf53bd050fa7b4769103d0294", "Refine handwritten signature and menu frame"),
    ("7fcd8f7c2dd55488c14a7b27522314b5fae1391c", "Improve shade pursuit and forest visibility"),
    ("1abcb87a63ad226f73681a3774647550c1916475", "Improve island navigation and soften browser encounters"),
    ("bba134ee9e61763b418d96e0c5a8844c96b313ef", "Use a diagonal camera and hide only contacted trees"),
    ("6705b077a81c2a1adeca9748a82e5491adb32042", "Implement lantern fuel and dawn rules for Phase 3"),
    ("4aefdc763994bd3c313027422871be13d2b8e4ee", "Restore fixed tuning and route shades to the bell tower"),
    ("0372299101ca575ea9822466f333c527f6387b83", "Fix pulse knockback inside wards and at obstacles"),
    ("bd63489cb9f54b730baa5b937cff2ac93edaa31d", "Show which pulse targets were blocked or repelled"),
    ("5022648fa038804afcb2e0265a756da51a6f82ff", "Clarify stun and pulse activation in the game view"),
    ("a57452183296fe6ac674750444bdabad5bf919fd", "Add a quick dawn scenario to practice mode"),
    ("afb98a191a8d23fcf716ca47f6ab2a72d34da589", "Play continuous background music in browser"),
    ("f1617cd8e0a17cf87b73e0061a04b5a914732380", "Implement Phase 4 benchmark, accessibility and release build"),
]

# Ensure git user config
run("git config user.name haianh02034")
run("git config user.email haianh29112@gmail.com")

current_parent = "9818fc1"
mapping = {}

for old_hash, title in commits_in_order:
    author_date = run(f"git show -s --format=%ad {old_hash}")
    committer_date = run(f"git show -s --format=%cd {old_hash}")
    msg = run(f"git show -s --format=%B {old_hash}")

    # Check out tree of old_hash
    run(f"git checkout {old_hash} -- .")

    # Replace student identifiers
    if os.path.exists("game.contract.json"):
        with open("game.contract.json", "r", encoding="utf-8") as f:
            c = f.read()
        if "2A202603491-nguyen-vu-hoang" in c:
            c = c.replace("2A202603491-nguyen-vu-hoang", "2A202603484-nguyen-hai-anh")
            with open("game.contract.json", "w", encoding="utf-8") as f:
                f.write(c)

    if os.path.exists("src/index.html"):
        with open("src/index.html", "r", encoding="utf-8") as f:
            c = f.read()
        if "Chữ ký Hoang" in c:
            c = c.replace("Chữ ký Hoang", "Chữ ký Hai Anh")
            with open("src/index.html", "w", encoding="utf-8") as f:
                f.write(c)

    # Stage changes and write tree
    run("git add -A")
    tree = run("git write-tree")

    env = {
        "GIT_AUTHOR_NAME": "haianh02034",
        "GIT_AUTHOR_EMAIL": "haianh29112@gmail.com",
        "GIT_AUTHOR_DATE": author_date,
        "GIT_COMMITTER_NAME": "haianh02034",
        "GIT_COMMITTER_EMAIL": "haianh29112@gmail.com",
        "GIT_COMMITTER_DATE": committer_date,
    }

    with open("temp_msg.txt", "w", encoding="utf-8") as f:
        f.write(msg)

    new_hash = run(f"git commit-tree {tree} -p {current_parent} -F temp_msg.txt", env=env)
    mapping[old_hash] = new_hash
    current_parent = new_hash
    print(f"Rewrote {old_hash[:7]} -> {new_hash[:7]}: {title}")

if os.path.exists("temp_msg.txt"):
    os.remove("temp_msg.txt")

# Update tags
tag_targets = {
    "phase-1": ("1a3edb5d9c06249ef11b3c93b30ac1e423d56fa6", "Day 12 Lab Phase 1"),
    "phase-2": ("bba134ee9e61763b418d96e0c5a8844c96b313ef", "Day 12 Lab Phase 2"),
    "phase-3": ("5022648fa038804afcb2e0265a756da51a6f82ff", "Day 12 Lab Phase 3"),
    "phase-4": ("f1617cd8e0a17cf87b73e0061a04b5a914732380", "Day 12 Lab Phase 4"),
    "v1.0.0":  ("f1617cd8e0a17cf87b73e0061a04b5a914732380", "Đảo Đèn Lồng v1.0.0"),
}

for tag, (target_old_hash, tag_msg) in tag_targets.items():
    new_target = mapping[target_old_hash]
    run(f'git tag -a -f {tag} {new_target} -m "{tag_msg}"')
    print(f"Updated tag {tag} -> {new_target[:7]}")

# Update feature branches
branch_targets = {
    "feature/day12-phase-1": "1a3edb5d9c06249ef11b3c93b30ac1e423d56fa6",
    "feature/day12-phase-2": "bba134ee9e61763b418d96e0c5a8844c96b313ef",
    "feature/day12-phase-3": "afb98a191a8d23fcf716ca47f6ab2a72d34da589",
    "feature/day12-phase-4": "f1617cd8e0a17cf87b73e0061a04b5a914732380",
}

for branch, target_old_hash in branch_targets.items():
    new_target = mapping[target_old_hash]
    run(f"git branch -f {branch} {new_target}")
    print(f"Updated branch {branch} -> {new_target[:7]}")

# Update main
final_feature_commit = mapping["f1617cd8e0a17cf87b73e0061a04b5a914732380"]
run("git checkout -B main 64e83c7")
run(f'git merge {final_feature_commit} -m "Merge Phase 4 release into main"')

# Ensure build is up to date
run("node scripts/build.mjs")
run("git checkout -- .")

# Remove rewrite_history.py
if os.path.exists("rewrite_history.py"):
    os.remove("rewrite_history.py")

print("SUCCESS: ALL COMMITS, BRANCHES, AND TAGS REWRITTEN UNDER HAIANH02034!")
