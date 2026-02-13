/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Community from './pages/Community';
import CreateGoal from './pages/CreateGoal';
import CreateHabit from './pages/CreateHabit';
import Dashboard from './pages/Dashboard';
import Finance from './pages/Finance';
import FirstAccess from './pages/FirstAccess';
import GoalDetail from './pages/GoalDetail';
import Goals from './pages/Goals';
import Habits from './pages/Habits';
import Notes from './pages/Notes';
import Oracle from './pages/Oracle';
import Progress from './pages/Progress';
import Tasks from './pages/Tasks';
import Titles from './pages/Titles';
import UnifiedTasks from './pages/UnifiedTasks';
import Auth from './pages/Auth';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Community": Community,
    "CreateGoal": CreateGoal,
    "CreateHabit": CreateHabit,
    "Dashboard": Dashboard,
    "Finance": Finance,
    "FirstAccess": FirstAccess,
    "GoalDetail": GoalDetail,
    "Goals": Goals,
    "Habits": Habits,
    "Notes": Notes,
    "Oracle": Oracle,
    "Progress": Progress,
    "Tasks": Tasks,
    "Titles": Titles,
    "UnifiedTasks": UnifiedTasks,
    "Auth": Auth,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};