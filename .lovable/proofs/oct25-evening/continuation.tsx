/** Fixture-only screen proof; never mounted in the athlete application. */
import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {BuntRepFields} from '@/components/practice/BuntRepFields';
import {SportThemeProvider} from '@/contexts/SportThemeContext';
import {AuthContext} from '@/contexts/AuthContext';
import {PitchLogger} from '@/components/games/PitchLogger';
import '@/index.css';
const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
function App(){
 const [value,setValue]=React.useState({});
 const game=new URLSearchParams(location.search).get('kind')==='game';
 return <main className="p-4"><h1 className="mb-4 text-xl font-bold">Bunting</h1>{game ? <PitchLogger gameId="fixture-game" sport="baseball" /> : <BuntRepFields value={value} onChange={(field,val)=>setValue(prior=>({...prior,[field]:val}))} batterSide="R" mode="quick" />}</main>;
}
const root=document.getElementById('root');
if(root)createRoot(root).render(<BrowserRouter><QueryClientProvider client={client}><AuthContext.Provider value={{user:null,loading:false,isAuthStable:true} as React.ContextType<typeof AuthContext>}><SportThemeProvider><App/></SportThemeProvider></AuthContext.Provider></QueryClientProvider></BrowserRouter>);