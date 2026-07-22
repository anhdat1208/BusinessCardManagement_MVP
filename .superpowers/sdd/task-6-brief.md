### Task 6: Verification checklist

**Files:** none new (verification only)

- [ ] **Step 1: Run shared unit tests**

```powershell
cd ...\shared
npm test
```

Expected: PASS.

- [ ] **Step 2: Confirm Discord adapter starts**

```powershell
cd ...\discord-bot
npm start
```

Expected: `Discord bot ready...` (stop after confirm if no live test).

- [ ] **Step 3: Confirm Slack adapter starts**

```powershell
cd ...\slack-bot
npm start
```

Expected: `Slack bot ready (Socket Mode)` when `.env` is filled.

- [ ] **Step 4: Spec coverage check (agent)**

Confirm against spec success criteria:

1. shared owns pipeline â€” yes via Task 3  
2. Discord UX unchanged â€” Task 4  
3. Slack channel + image â€” Task 5  
4. No secrets in examples â€” Task 5 `.env.example`  
5. GAS unchanged â€” no GAS edits  

- [ ] **Step 5: Commit** â€” skip.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| `shared/` extract | 1â€“3 |
| Parameterize `source` | 1 |
| Discord rewire | 4 |
| Slack Socket Mode + channel filter + images | 5 |
| Separate `.env` / placeholders | 5 |
| Tests keep passing | 1â€“3, 6 |
| No 24/7 deploy / no search billing | out of scope (not in tasks) |
| GAS New version | not required |

No TBD placeholders. Signatures consistent: `processBusinessCard`, progress phase strings, `createResearchAI`.
