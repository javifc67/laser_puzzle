import { useContext } from "react";
import "./../assets/scss/MainScreen.scss";
import { GlobalContext } from "./GlobalContext.jsx";


export default function MainScreen({ solvePuzzle, solved }) {
    const { appSettings: config} = useContext(GlobalContext);

    return (
        <div className={`mainScreen`}>
            
        </div>
    );
}
