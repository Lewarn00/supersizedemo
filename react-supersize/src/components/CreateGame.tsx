import { PublicKey } from '@solana/web3.js';
import React,  {useCallback, useEffect, useRef, useState} from 'react';
import Button from "./Button";
import "./CreateGame.scss";

type gameProps = {
    initFunction: (...args: any[]) => void;  // General function accepting any arguments
};

type FormData = [number, number, number, number, number, number, boolean];

const CreateGame: React.FC<gameProps> = ({ initFunction }) => {
    // Initialize the state as an array with default values
    const [formData, setFormData] = useState<FormData>([1500, 1500, 100, 2, 0, 20, false]);
  
    // Handle changes in the form inputs
    const handleChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const { type, checked, value } = e.target;

      // Create a copy of the formData array with type assertion
      const updatedFormData = [...formData] as FormData;
  
      // Explicitly handle each type scenario
      if (type === 'checkbox') {
        updatedFormData[index] = checked as boolean;  // Force boolean type for checkbox
      } else {
        updatedFormData[index] = parseFloat(value) as number;  // Force number type for others
      }
  
      setFormData(updatedFormData);
    };
  
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      console.log('Form Data Submitted:', formData);
    };
      {/*<div className="container">*/}  
    return (
        <form className="form-box" onSubmit={handleSubmit}>
          <h2 className="form-title">Game Settings</h2>
          <label>
          <span style={{marginBottom:"5px", marginLeft:"10px" }}>Game Size</span>
            <input className="no-arrows"  id="forminput" type="number" name="size" value={String(formData[0])} onChange={() => {handleChange(0); handleChange(1);}} />
          </label>
          <label>
          <span style={{marginBottom:"5px", marginLeft:"10px" }}>Buy In</span>
            <input className="no-arrows"  id="forminput" type="number" name="entryFee" value={String(formData[2])} onChange={handleChange(2)} />
          </label>
          <label>
          <span style={{marginBottom:"5px", marginLeft:"10px" }}>Max Players</span>
            <input className="no-arrows"  id="forminput" type="number" name="maxPlayers" value={String(formData[3])} onChange={handleChange(3)} />
          </label>
          <label>
          <span style={{marginBottom:"5px", marginLeft:"10px" }}>Token</span>
            <input id="forminput" type="text" name="token" value={'token address'}/>
          </label>
          <label style={{flexDirection:"row"}}>
          <span style={{marginBottom:"5px", marginLeft:"10px" }}>Frozen</span>
            <input type="checkbox" name="frozen" checked={formData[6] as boolean} onChange={handleChange(6)} style={{flexGrow:0,marginRight:"auto", marginBottom:"3px", background:"black"}}/>
          </label>
          <Button buttonClass="create-game-button" title={"Create Game"} onClickFunction={initFunction} args={formData}/>  
        </form>
    );
  };
  
  export default CreateGame;
