# TODO - Wire Premium HomeDashboard as the default Home view

## Goal
Make the existing premium `HomeDashboard` component the default "Home" tab of the FinWise app, wired to real data, without breaking any existing tabs/features.

## Steps

### Analysis
- [x] Analyze codebase (app/page.js, components/HomeDashboard.jsx, server routes, APIs, auth, LifeSimulator)
- [x] Confirm HomeDashboard is imported but never rendered (dead code)
- [x] Create plan & get approval

### Implementation
- [x] 1. Add `activeTab` state to `app/page.js` (default 'home')
- [x] 2. Add `simulatorScenario` state to `app/page.js` (default 'bike')
- [x] 3. Make the Tabs component controlled (`value={activeTab}` / `onValueChange={setActiveTab}`)
- [x] 4. Add a "Home" tab as the first tab triggering `overview`
- [x] 5. Render `<HomeDashboard>` with all props (user, analysis, transactions, budget, setActiveTab, setForm, setSimulatorScenario)
- [x] 6. Pass `defaultScenario={simulatorScenario}` to the existing `LifeSimulator` (so widget scenario buttons pre-select)
- [x] 7. Fix "Weekly Money Story" bug in HomeDashboard.jsx (literal template braces)

### Verification
- [x] 8. Run production build (next build) - page compiled successfully (no syntax/compile errors)
- [ ] 9. Verify all existing tabs still function
- [ ] 10. Verify responsive layout on desktop/mobile
