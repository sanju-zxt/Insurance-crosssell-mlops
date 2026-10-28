# Demo script

A click-by-click walkthrough of the running stack, written so it can be delivered
without thinking about it twice. Total time: **90 seconds of talking**, three
screens.

Everything below was executed and screenshotted on 2026-10-28; the
`docs/img/` screenshots in the README come from the same session.

---

## Before you start (once, ~90 s)

Docker Desktop does not auto-start on this machine. Launch it and wait for the
engine:

```powershell
& "C:\Users\Sanju\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe"
# then poll until it answers (usually 60-90 s)
docker version --format '{{.Server.Version}}'
```

Bring the stack up and confirm both services:

```powershell
cd C:\Users\Sanju\Projects\insurance-crosssell-mlops
docker compose up -d --build
docker compose ps
```

Expected:

```
api     Up (healthy)   0.0.0.0:8000->8000/tcp
mlflow  Up             0.0.0.0:5000->5000/tcp
```

Open these three tabs **now**, so nothing loads on camera:

| tab | URL |
| --- | --- |
| 1 | <http://127.0.0.1:8000/docs> |
| 2 | <http://127.0.0.1:8000/model/info> |
| 3 | <http://127.0.0.1:5000/#/experiments/2/runs> |

Stop everything afterwards with `docker compose down`.

---

## Screen 1 — a prediction (30 s)

Tab 1, <http://127.0.0.1:8000/docs>

1. Expand **`POST /predict`**.
2. **Try it out**.
3. Replace the body with:

```json
{"Gender":"Female","Age":44,"HasDrivingLicense":1,"RegionID":28,
 "Switch":0,"PastAccident":"Yes","AnnualPremium":1354}
```

4. **Execute**.

Expected:

```json
{
  "will_cross_sell": true,
  "probability": 0.763604,
  "threshold": 0.59,
  "model_version": "insurance-crosssell-mlops-20261027163636"
}
```

**Say:** *"That's a real customer from the held-out test set who genuinely bought.
The model puts her at 0.76 against a 0.59 threshold."*

5. Change `"PastAccident":"Yes"` to `"No"` and **Execute** again.

Expected: `probability: 0.086202`, `will_cross_sell: false`.

**Say:** *"Same customer, one field flipped, and the score collapses nine-fold.
`PastAccident` is the strongest signal in the model — which is exactly the kind of
thing you only find out by scoring real rows, not by reading a metric."*

---

## Screen 2 — the model describes itself (15 s)

Tab 2, <http://127.0.0.1:8000/model/info>

**Say:** *"Every served model carries its own lineage: version, threshold, feature
order and all six metrics, written next to the artifact at save time. The API can't
serve a model it can't describe — and if the artifact is missing, this endpoint says
so instead of pretending."*

Worth pointing at: `threshold 0.59`, `roc_auc 0.7978444133735707`,
`average_precision 0.27768006869962003`.

---

## Screen 3 — tracking and registry (30 s)

Tab 3, <http://127.0.0.1:5000/#/experiments/2/runs>

1. Point at the experiment **`xsell-propensity`** and the run row
   (`puzzled-ray-385`, FINISHED, `roc_auc 0.7978`).
2. Click the run.
3. Walk the tabs: **Parameters → Model metrics → Artifacts → Models**.

**Say:** *"Every training run is tracked, not just dumped in a folder — params,
metrics, the artifact itself, and a registered version `xsell_propensity v1` whose
source is the MLflow artifact store, not someone's laptop. Getting the artifact
upload to go through the server rather than the client's own disk was one of the two
deployment bugs I had to fix."*

---

## The 90-second narrative

Deliver in this order — result first, engineering second, judgment last.

1. **Money first.** *"An insurer has 100,000 policyholders. Selling one more product
   to the right 10% is worth more than a better model nobody can deploy."*
2. **The result.** *"`roc_auc 0.798`. But the number I care about: the top 10% of
   scores actually buys at 30% versus an 11.8% baseline — a 2.5× lift. That's the
   business case."*
3. **Then the engineering.** *"47 tests, CI that also builds the image, config-driven
   so a whole experiment is a YAML edit, a typed FastAPI contract, MLflow registry,
   and a container that reports itself unhealthy when the model is missing."*
4. **Close on judgment.** *"The interesting part wasn't the model — it was the two
   deployment bugs. The image was silently shipping without the model artifact, and
   the healthcheck was reporting that broken container as healthy."*

---

## If something breaks on the day

| symptom | fix |
| --- | --- |
| `docker` commands fail to connect | Docker Desktop isn't up yet — launch it, wait for `docker version` |
| port 8000 already in use | `docker compose down`, then check `Get-NetTCPConnection -LocalPort 8000` |
| MLflow UI shows no experiments | wrong store — compose uses `./mlruns/mlflow.db`; make sure the `mlflow` service is the one running |
| API returns 503 | the model isn't mounted; `docker compose up -d --build` |
| Docker won't start at all | fall back to the host venv: `.venv\Scripts\Activate.ps1; uvicorn xsell.api.main:app --app-dir src` and skip screen 3, or show the README screenshots |

---

## Likely questions, straight answers

**Why is accuracy 0.72 when the base rate is 12%?**
Because the threshold is tuned for recall, not accuracy. A model that predicts
"nobody buys" scores 0.88 accuracy and is useless. At 0.59 the model catches 71% of
actual buyers while staying at 26% precision — the right trade when a call is cheap
and a missed sale isn't.

**Why SMOTE?**
The positives are ~12% of rows. Resampling the training fold makes the classifier
spend its capacity on the minority class instead of the majority; it is applied
inside the pipeline so it never touches the test set.

**What does "config-driven" actually buy you?**
`configs/base.yml` holds paths, imputation/scaling strategy, resampler, estimator and
hyper-parameters, threshold, artifact path and tracking settings. Swapping to
logistic regression is a two-line config edit — no Python change.

**What isn't production-ready?**
No drift monitoring, no automated retrain gate, and promotion is still a file copy
rather than a registry action. All three are written up under *What I would do next*
in the README — I would rather name the gaps than pretend they don't exist.

**How was this built?**
*"The dataset and problem framing are public — I rebuilt an existing MLOps reference
implementation from scratch to understand every layer. The package, config schema,
API, tests, container and CI are mine, and so are the two deployment bugs I found
and fixed."* This is a stronger answer than claiming invention, and it survives a
follow-up question.
