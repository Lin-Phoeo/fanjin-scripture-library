import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppStateProvider, useAppState } from '/src/context/AppStateContext';
import { usePersonalPreferences } from '/src/lib/personal-preferences';
function Harness(){const account=useAppState();const preferences=usePersonalPreferences();window.preferenceHarness={account,preferences};return <pre id="state">{JSON.stringify({user:account.session?.name,value:preferences.value,loading:preferences.loading,saving:preferences.saving,status:preferences.status,error:preferences.error})}</pre>;}createRoot(document.getElementById('root')).render(<AppStateProvider><Harness/></AppStateProvider>);
