# How to Think and Work Like a CLI Engineer

> A first-principles guide written from real work done on this project.

---

## Why this matters now

AI agents are accelerating development speed dramatically. But if you can only evaluate what an agent does by clicking around in UIs, you become the bottleneck. The agent outputs commands; you need to read them, verify they did what they were supposed to do, and catch it when it goes wrong.

This guide teaches the mental model — not a list of commands to memorise.

---

## First principle: Everything is text

The terminal is a place where programs communicate by sending text to each other.

Every program you run:
- Reads text input (stdin)
- Writes text output (stdout)
- Writes error output (stderr)
- Exits with a number (exit code: 0 = success, anything else = failure)

That's it. All of DevOps is just programs passing text to each other in clever ways.

When I ran:
```powershell
fly logs --app noteflow-log-shipper
```

I was asking the `fly` program to fetch text from Fly.io's API and print it to my screen. When the log-shipper was crash-looping, the output was text that told me exactly what was happening — I just had to read it.

---

## First principle: The shell is a conversation

You say something. The program says something back. You respond.

The skill is learning to read what programs say. Most developers stop reading after the first error and start Googling. The error message usually contains the diagnosis.

**Example from this project:**

```
ERROR [2/2] COPY config.alloy /etc/alloy/config.alloy
"/config.alloy": not found
```

Reading it literally: "I tried to copy `config.alloy` from the root of the build context, and it wasn't there." That's a complete diagnosis. The file exists at `alloy/config.alloy`, not `config.alloy`. Fix: `COPY alloy/config.alloy /etc/alloy/config.alloy`.

No Googling required. The shell told you.

---

## First principle: Inspect, then act

Before doing anything, find out where you are and what state things are in.

In every new situation I follow this sequence:
1. **What exists?** (`git status`, `fly apps list`, `fly logs`)
2. **What's different from what I expect?** (read the output)
3. **What's the minimum change to get closer to working?**
4. **Make the change.**
5. **Go back to step 1.**

This is the feedback loop. Every problem in this project was solved by tightening this loop.

---

## First principle: Error messages are information, not obstacles

Most developers feel a spike of anxiety when they see red text. Treat it as data instead.

Error messages typically contain:
- **What** went wrong (the error type)
- **Where** it went wrong (file, line, service)
- **Sometimes why** (the cause)

**Example from this project — the OTel traces bug:**

We knew traces weren't reaching Grafana Tempo. Rather than guessing, I wrote a test script that called the API directly and watched what came back. The probe response said:

```
"No gateway downstream URL was configured for a request to URL: /v1/traces"
```

This told us: the gateway feature exists on this host, but it's not configured to forward `/v1/traces` traffic. That's a different error from "endpoint not found" — it means we're on the wrong host entirely. The correct host was the OTLP gateway, not the Tempo datasource URL.

The error told us exactly what to look for next.

---

## First principle: State lives somewhere

Every platform stores state. When something is broken, your job is to find where the state is and what's wrong with it.

| Platform | Where state lives | How to inspect it |
|---|---|---|
| Git | `.git/` folder | `git status`, `git log`, `git diff` |
| Fly.io | Their API | `fly status`, `fly logs`, `fly machine list` |
| Doppler | Their API | Doppler dashboard, `doppler secrets` CLI |
| Docker | Image layers | `docker inspect`, build output |
| The app | Stdout logs | `fly logs --app <name>` |

When the fly-log-shipper was crash-looping, I didn't guess — I read `fly logs` to see what the machine was actually doing. The output showed it was dying at the Firecracker boot stage, before the app even started. That narrowed the cause: not an app bug, but bad state on the machine itself. Fix: destroy the machines and start fresh.

---

## The patterns I actually used

### Pattern 1: Read logs before anything else

When something is broken, the first thing I do is read the logs. Not guess, not restart — read.

```powershell
fly logs --app noteflow-staging
fly logs --app noteflow-log-shipper
```

Logs tell you:
- Whether the app started at all
- Whether it crashed and why
- Whether external connections succeeded
- What requests came in and what the responses were

**What to look for:**
- The word `error` or `ERROR` — read the full line and the lines around it
- Stack traces — read the top line (the error) and the bottom few lines (where in your code)
- Repeated lines — a crash loop shows the same startup sequence repeating every few seconds

### Pattern 2: Isolate before integrating

When I wasn't sure if the Grafana Cloud credentials were correct, I didn't deploy and wait — I wrote `scripts/test-grafana.ts` to test each signal in isolation first.

The principle: **before wiring two systems together, prove each one works independently.**

This is why the test script tests Loki, Tempo, and Prometheus separately. If Tempo fails but Loki passes, I know the OTLP endpoint is wrong, not the API key.

### Pattern 3: Work backwards from the symptom

The log-shipper was stuck at "Configuring firecracker" with no app output. Working backwards:

- No app output → app never started
- Never started → died before starting
- Died before starting → crashed at boot, OR infrastructure issue
- Crash at boot → bad config, OR missing dependency
- The machine hit max restarts → it crashed fast 10 times before Fly.io gave up

Most likely: the app crashed immediately on startup. Most likely cause: bad credentials causing an immediate auth failure. The fix was to reset with good credentials and fresh machines.

### Pattern 4: Make the smallest possible change

When something is broken, change one thing, then check if it helped.

I didn't guess that "maybe the endpoint AND the credentials AND the protocol are all wrong." I changed one variable at a time:
1. Fix the endpoint → still broken
2. Fix the protocol (`http/protobuf`) → still broken
3. Use the correct gateway host → works ✅

If I'd changed all three at once and it worked, I wouldn't know which one mattered. That matters when you're writing it up, teaching someone else, or hitting the same issue next time.

### Pattern 5: Leave a trail

Every time I ran a command, I committed the result or documented the finding. This isn't just for record-keeping — it's so the next time you hit the same situation, you have the answer.

The `findings.md` file is a direct output of this: every problem, its root cause, and the fix. Not "we had an issue with Tempo" — the specific error message, the wrong assumption, and exactly what fixed it.

---

## How to read a log stream

Logs have a structure. Once you see it, you can read logs from any system.

```
2026-06-18T13:06:43Z  app[e820644b717998]  lax  [info]  Vector has started.
│                     │                    │     │        │
│                     │                    │     │        └─ the message
│                     │                    │     └─ severity (info/warn/error)
│                     │                    └─ region
│                     └─ which machine
└─ timestamp (UTC)
```

When scanning logs:
- **Sort by time** — logs are chronological; the error appears after the thing that caused it
- **Look for level=error** — skip the `info` lines until something is wrong
- **Find the repetition pattern** — if the same block repeats, that's a crash loop
- **Read 5 lines before the error** — the error line rarely tells you what happened; the lines before it show what the program was doing when it failed

---

## How CLI tools compose

The real power isn't any single command — it's chaining them.

```powershell
# Get the current git short SHA (used for image tags in CD pipeline)
git rev-parse --short HEAD

# Feed it into a fly deploy command
fly deploy --image "ghcr.io/gd-mrng/noteflow:sha-$(git rev-parse --short HEAD)"
```

```powershell
# Get your fly auth token and use it immediately as a secret
fly secrets set ACCESS_TOKEN="$(fly auth token)" --app noteflow-log-shipper
```

The `$(...)` syntax means "run this command and use its output as text here." You're composing two programs: one that produces a token, one that consumes it.

This is what makes CLI powerful — each tool does one thing, and you chain them together to build complex operations.

---

## The confidence model

How do I know when I trust output?

**I trust it when:**
- The exit code is 0 (command succeeded)
- The output explicitly says something succeeded (`✔ Machine created`, `204 No Content`)
- I can verify it independently (curl the endpoint, check the dashboard)

**I don't trust it when:**
- The command succeeded but the output is ambiguous
- A health check passed but I haven't hit the actual endpoint
- Logs show startup but I haven't generated any real traffic

This is why after every deploy I always hit `https://noteflow-staging.fly.dev/api/health` — not because I don't trust the deploy output, but because a health check endpoint is an independent verification that the *app* works, not just that the *deployment* succeeded.

---

## Building this skill

You already have the fundamentals — you use the shell for basic things. The gap is practice and pattern recognition. Here's how to close it:

**1. Read first, act second.**
Next time something breaks in a UI, open the terminal first. Run the `logs` command for that service before clicking anything. Get used to logs being your primary information source.

**2. Write test scripts.**
When you're about to integrate two things, write 20 lines that test each one first. The `test-grafana.ts` script in this project took 30 minutes to write and saved hours of deploy-wait-check cycles.

**3. Commit your commands.**
When you find a command that works, put it in a script or a runbook. `docs/runbooks/` in this project exists precisely because "the command I ran last time" is valuable information.

**4. Read the error, then the lines before it.**
When you get an error, resist the urge to Google immediately. Read the full error. Read the 5 lines above it. You'll find the answer in the output more than half the time.

**5. Change one thing at a time.**
When debugging, form a hypothesis ("I think X is wrong"), change only X, and check. If you're right, you learned something. If you're wrong, you still learned something.

---

## The key realisation

The CLI isn't a collection of commands to memorise. It's a way of talking to systems.

Every `fly logs`, `git diff`, `curl https://...` is a question you're asking. The output is the answer. Your job is to keep asking until the answers make sense and the system does what you want.

The commands are just vocabulary. The mental model is the language.
