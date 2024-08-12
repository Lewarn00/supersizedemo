import React, {useCallback, useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import Button from "./components/Button";
import FoodEntity from "./components/FoodEntity";
import PlayerEntity from "./components/PlayerEntity";
import CreateGame from "./components/CreateGame";
import SelectGame from "./components/SelectGame";
import GameComponent from "./components/GameComponent";

import {
    AddEntity,
    ApplySystem,
    createApplyInstruction,
    createInitializeComponentInstruction,
    FindComponentPda,
    FindWorldPda,
    FindEntityPda,
    createAddEntityInstruction,
    createInitializeRegistryInstruction,
    FindRegistryPda,
    InitializeNewWorld,
    InitializeComponent,
    createDelegateInstruction,
    DELEGATION_PROGRAM_ID,
    createAllowUndelegationInstruction,
    createUndelegateInstruction,
} from "@magicblock-labs/bolt-sdk";

import {WalletNotConnectedError} from '@solana/wallet-adapter-base';
import {useConnection, useWallet} from '@solana/wallet-adapter-react';
import {WalletMultiButton} from "@solana/wallet-adapter-react-ui";
import Alert from "./components/Alert";
import {AccountInfo, Commitment, PublicKey} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {Idl, Program, Provider, Wallet, AnchorProvider} from "@coral-xyz/anchor";
import {SimpleProvider} from "./components/Wallet";
import { Connection, clusterApiUrl, Keypair, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction,SystemProgram } from '@solana/web3.js';
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import BN from 'bn.js';

//import { Map } from "../../../target/types/map";
const bs58 = require('bs58');

const WORLD_INSTANCE_ID = 4;

// Components
/*
const MAP_COMPONENT = new PublicKey("4N4sCnoj54MHH3i4GvQDtFKrW7qXHNnZJDaPbBUkdLgM");
const PLAYERS_COMPONENT = new PublicKey("4eBxpSfDfvDZsxRsVJffJ36iXeqdQWgNZnQ4v9fB2Wv2");

// Systems
const CHARGE_ATTACK = new PublicKey("5SBr9xVUzcZvWsQQNoM2nkPCiy9cJMBCqbqef7QJUai5");
const MOVEMENT = new PublicKey("4Kt6RcZqpg6ACdW8s12PvBJuT41Eyth38HPt1sFQKTD2");
const MOVEMENT2 = new PublicKey("8pt8Zuzu17zpfPWyDiQdfg1E7Vd4AooxPhrry3HSxz9R");
const INIT_GAME = new PublicKey("AmFgpUC4aeMHuxwWacdfhP2Zm87UhbQNE5GfGGz2qqGe");
const EXIT_GAME = new PublicKey("6BMA8V5xXd7n5PKDPHBYpSjFA2SaEaH9qBSVjczRNF56");
const JOIN_GAME = new PublicKey("3s6QDH2QqbYFwtdoZLf2rdbvkSfu9tZzjZQAKL7zn7fx");
const MOVEMENT_LITE = new PublicKey("GzXY6vgrHF3zEnBDWXrEx4vTHZ9gqKGnib3B9EiDbnjF");
const EAT = new PublicKey("Dcqcj2TjcauBe2eCghLKRVew3RHWhCNJPaJEaFWYwnYk");*/

//new
const PLAYER_COMPONENT = new PublicKey("6Fop7M4mMiaychdgjqfbG1T9nCakkQ3qYiJdCvWqoNUk"); //anchor.workspace.Player1 as Program<Player1>;
const MOVEMENT = new PublicKey("D8FAfmH5VUExyXkR1LauJ1AegDo4oBm1hJeC1pM8moSF");
const JOIN_GAME = new PublicKey("AqgLKUT9xHw8AWkhhcYavPh5RRSpWZcFoeMtq8VrFFcS");
const EXIT_GAME = new PublicKey("7oVQL91wR82S6tPtTftpgqnsYkeYuXxBshmauAhoLf2k");
const FOOD_COMPONENT = new PublicKey("GpcXtob64TmsL9gGCk44EBoQWS8SSej9vU1kJgFVE4se");
const MAP_COMPONENT = new PublicKey("2NtsDp7az1CxG1v6HFPWekYQkhbJC7ZVHFF5GBSGaC7K");
const INIT_GAME = new PublicKey("BYA1jUA9yTtdxoU8QECwW4vi9aojn1KQaxfQXRffEqeC");
const EAT_FOOD = new PublicKey("BMVTi61fTnQCtoGiMi1m4eXKnxGmxDoTcLL2CV3dAZDp");

interface Food {
    x: number;
    y: number;
}
interface Blob {
    authority: PublicKey;
    x: number;
    y: number;
    radius: number;
    mass: number;
    score: number;
    speed: number;
    charging: number;
}


type ActiveGame = {
    worldPda: PublicKey;
    worldId: BN;
  };

const App: React.FC = () => {
    //let { connection } =  useConnection();
    const  connection =  new Connection("https://devnet.helius-rpc.com/?api-key=cba33294-aa96-414c-9a26-03d5563aa676"); 
    const { publicKey, sendTransaction } = useWallet(); 
    let userKey = publicKey;

    const [wallet] = useState<Keypair>(() => Keypair.generate());
    
    //const connection = new Connection(clusterApiUrl('devnet'), {
    //    commitment: 'processed',
    //  });
      
    const provider = new anchor.AnchorProvider(
        connection,
        new NodeWallet(wallet),
        {
            preflightCommitment: 'processed',
            commitment: 'processed',
        }
    );
    
    anchor.setProvider(provider);

    const providerEphemeralRollup = new anchor.AnchorProvider(
        new anchor.web3.Connection("https://supersize.magicblock.app", {
        wsEndpoint: "wss://supersize.magicblock.app",
        }),
        new NodeWallet(wallet) //anchor.Wallet.local()
    );

    const [playerKey, setPlayerKey] = useState<PublicKey>(wallet.publicKey);
    const walletRef = useRef<Keypair>(wallet);

    const [players, setPlayers] = useState<Blob[]>([]);
    const [allplayers, setAllPlayers] = useState<Blob[]>([]);
    const [leaderboard, setLeaderboard] = useState<Blob[]>([]);
    const [food, setFood] = useState<Food[]>([]);
    const [visibleFood, setVisibleFood] = useState<Food[]>([]);
    const [currentPlayer, setCurrentPlayer] = useState<Blob | null>(null);
    const [creatingGame, setCreatingGame] = useState(false);
    const [delegationDone, setDelegationDone] = useState(false);
    const [expandlist, setexpandlist] = useState(false);
    const [timeToEat, setTimeToEat] = useState(false);
    const [newGameCreated, setNewGameCreated] = useState<ActiveGame | null>(null);
    const [currentTPS, setCurrentTPS] = useState(0);
    const [price, setPrice] = useState(0);
    const [confirmedXY, setConfirmedXY] = useState<any | null>(null);
    const scale = 1;
    const [screenSize, setScreenSize] = useState({width: 1500,height: 1500}); //530*3,300*3
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [transactionError, setTransactionError] = useState<string | null>(null);
    const [transactionSuccess, setTransactionSuccess] = useState<string | null>(null);
    const [activeGameIds, setActiveGameIds] = useState<PublicKey[]>([new PublicKey('4gc82J1Qg9vJh6BcUiTsP73NCCJNF66dvk4vcx9JP7Ri'),new PublicKey('uk8PU7wgRzrqhibkhwQzyfJ33BnvmAzRCbNNvfNWVVd')]); //new PublicKey('DS3511vmVxC4MQpiAQawsh8ZmRTy59KqeDRH9vqUcfvd')
    const [activeGames, setActiveGames] = useState<ActiveGame[]>([{
        worldId: new anchor.BN(1029),
        worldPda: new PublicKey('6xDqgns9aMqXdCAXgAhonmN3tgU1CaEf9d9s99WenzMM'),
    } as ActiveGame]);
    const [openGameInfo, setOpenGameInfo] = useState<boolean[]>(new Array(activeGameIds.length).fill(false));
    let entityMatch = useRef<PublicKey | null>(null);
    let playerEntities = useRef<PublicKey[]>([]);
    let foodEntities = useRef<PublicKey[]>([]);
    let currentPlayerEntity = useRef<PublicKey | null>(null);
    const [gameId, setGameId] = useState<PublicKey | null>(null);

    let playersComponentSubscriptionId = useRef<number[] | null>([]);
    let foodComponentSubscriptionId = useRef<number[] | null>([]);
    let myplayerComponentSubscriptionId = useRef<number | null>(null);
    let mapComponentSubscriptionId= useRef<number | null>(null);

    // Use useRef for persisting values without causing re-renders
    const playersComponentClient = useRef<Program | null>(null);
    const mapComponentClient = useRef<Program | null>(null);
    const foodComponentClient = useRef<Program | null>(null); 

    const [isMouseDown, setIsMouseDown] = useState(false);
    const [mousePosition, setMousePosition] = useState({x: 0,y: 0});
    const [charging, setCharging] = useState<Boolean | null>(null);
    
    const [panelContent, setPanelContent] = useState<JSX.Element | null>(null);
    const [buildViewerNumber, setbuildViewerNumber] = useState(0);
    const [isHovered, setIsHovered] = useState([false,false,false,false,false,false]);

    const openDocs = useCallback(() => {
        window.open('https://docs.supersize.app/', '_blank');
    }, []); 
    const openX = useCallback(() => {
        window.open('https://x.com/SUPERSIZEapp', '_blank');
    }, []); 
    const runCreatingGame = useCallback(() => {
        setCreatingGame(true);
    }, []);


    const getComponentsClientBasic = useCallback(async (component: PublicKey): Promise<Program> => {
        //console.log("Fetching IDL for component:", component.toString());
        //console.log("Provider status:", provider.current);
        
        const idl = await Program.fetchIdl(component);
        //console.log("Fetched IDL:", idl);

        if (!idl) throw new Error('IDL not found');
        // Initialize the program with the dynamically fetched IDL
        //const programId = new Program(idl, provider.current);
        //console.log(idl,component, programId, provider.current)
        return new Program(idl, provider);
    }, [provider]);

    // Helpers to Dynamically fetch the IDL and initialize the components clients
    const getComponentsClient = useCallback(async (component: PublicKey): Promise<Program> => {
        //console.log("Fetching IDL for component:", component.toString());
        //console.log("Provider status:", provider.current);
        
        const idl = await Program.fetchIdl(component);
        //console.log("Fetched IDL:", idl);

        if (!idl) throw new Error('IDL not found');
        // Initialize the program with the dynamically fetched IDL
        //const programId = new Program(idl, provider.current);
        //console.log(idl,component, programId, provider.current)
        return new Program(idl, providerEphemeralRollup);
    }, [providerEphemeralRollup]);

    // Initialize the components clients to access the parsed account data
   /* useEffect(() => {
        const initializeComponents = async () => {
            playersComponentClient.current = await getComponentsClient(PLAYER_COMPONENT);
            mapComponentClient.current = await getComponentsClient(MAP_COMPONENT);
            foodComponentClient.current = await getComponentsClient(FOOD_COMPONENT);
        };
        initializeComponents().catch(console.error);
    }, [connection, getComponentsClient]);*/

    const updateFoodList = useCallback((section: any) => {
        const foodArray = section.food as any[];  
        const visibleFood: Food[] = [];
        const foodData: Food[] = [];
        //console.log('foodarray', foodArray);
        foodArray.forEach((foodItem) => {
            // Always add raw coordinates to the food array
            foodData.push({ x: foodItem.x, y: foodItem.y });
        
            if (currentPlayer) {
                const halfWidth = screenSize.width / 2;
                const halfHeight = screenSize.height / 2;
                const diffX = (foodItem.x - currentPlayer.x);
                const diffY = (foodItem.y - currentPlayer.y);
                if (Math.abs(diffX) <= halfWidth && Math.abs(diffY) <= halfHeight) {
                    // Food is visible, adjust position and log the adjusted food item
                    //console.log(foodItem, '1');
                    visibleFood.push({
                        x: diffX + screenSize.width / 2,
                        y: diffY + screenSize.height / 2
                    } as Food);
                }
            }
        });
        setFood(foodData); 
        setVisibleFood(visibleFood);
        //console.log(`food length: ${foodData.length}, visible food length: ${visibleFood.length}`);
    }, [setFood, screenSize, currentPlayer]);

    const updateLeaderboard = useCallback((players: any[]) => {
        const top10Players = players
        .sort((a, b) => b.score - a.score) 
        .slice(0, 10)
        .map(player => ({ 
            authority: player.authority,
            x: player.x,
            y: player.y,
            radius: Math.sqrt(player.mass) * 0.5,
            mass: player.mass,
            score: player.score,
            speed: player.speed,
            charging: 0,
        }));
        setLeaderboard(top10Players);
    }, [setLeaderboard, playerKey]);

    useEffect(() => {
        let status: string = '<span class="title">Leaderboard</span>';
        for (let i = 0; i < leaderboard.length; i++) {
          status += '<br />';
          const currentItem = leaderboard[i];
          if(currentPlayer && currentItem && currentItem.authority && currentPlayer.authority){
            if (currentItem.authority.equals(currentPlayer.authority)) {
                status += '<span class="me">' + (i + 1) + '. ' + currentItem.authority + "</span>";
            } else {
                status += (i + 1) + '. ' + currentItem.authority;
            }
          }else {
            status += (i + 1) + '. ' + currentItem.authority;
          }
        }
        // The following code assumes you are still manipulating the DOM directly
        const statusElement = document.getElementById('status');
        if (statusElement) {
          statusElement.innerHTML = status;
        }
      }, [setLeaderboard,leaderboard]); 

    const updateMyPlayer = useCallback((player: any) => {
        if (!player) {
            setCurrentPlayer(null);
            setPlayers([]);
            setFood([]);
            console.error("Player eaten, not in game.");
            return;
        }
        setCurrentPlayer({  
            authority: player.authority,
            x: player.x,
            y: player.y,
            radius: 4 + Math.sqrt(player.mass) * 6,
            mass: player.mass,
            score: player.score,
            speed: player.speed,
            charging: 0,
        } as Blob);
        /*
        const newCurrentPlayer = {
            authority: player.authority,
            x: player.x,
            y: player.y,
            radius: 4 + Math.sqrt(player.mass) * 6,
            mass: player.mass,
            score: player.score,
            speed: player.speed,
            charging: 0,
        } as Blob;

        const updateIntervals = 11; //9 
        const delay = 8; //8 

        for (let i = 0; i < updateIntervals; i++) {
            setTimeout(() => {
                setCurrentPlayer(currentPlayer => currentPlayer ? {
                    ...currentPlayer,
                    x: currentPlayer.x + ((newCurrentPlayer.x - currentPlayer.x) / updateIntervals),
                    y: currentPlayer.y + ((newCurrentPlayer.y - currentPlayer.y) / updateIntervals),
                } : newCurrentPlayer);
            }, delay);
        }*/

    }, [setCurrentPlayer, playerKey, food]);

    useEffect(() => {
        //console.log('all players',allplayers)
        if(currentPlayer){
        updateLeaderboard(allplayers);
        const newVisiblePlayers: Blob[] = allplayers.reduce((accumulator: Blob[], playerx) => {
            if (currentPlayer && playerx.authority && currentPlayer.authority){
                if(currentPlayer.authority != playerx.authority) {
                const halfWidth = screenSize.width / 2;
                const halfHeight = screenSize.height / 2;
                const diffX = (playerx.x - currentPlayer.x);
                const diffY = (playerx.y - currentPlayer.y);
    
                if (Math.abs(diffX) <= halfWidth && Math.abs(diffY) <= halfHeight) {
                    accumulator.push({
                        authority: playerx.authority,
                        x: diffX + screenSize.width / 2,
                        y: diffY + screenSize.height / 2,
                        radius: 4 + Math.sqrt(playerx.mass) * 6,
                        mass: playerx.mass,
                        score: playerx.score,
                        speed: playerx.speed,
                        charging: 0,
                    });
                }
            }
            }
            return accumulator;
        }, []);
        setPlayers(newVisiblePlayers);
        }
      }, [currentPlayer]);

    const updateMap = useCallback((map: any) => {
        const playerArray = map.players as any[];
        //console.log('players on map', playerArray);
        //console.log('players on map', playerArray)
        // Reduce the playerArray to a list of playerEntityIds
        const playerEntityIds = playerArray.map((player, index) => {
            const seed = player.toString().substring(0, 7); //'player-' + index.toString(); //player.toString().substring(0, 20); // Limit the size of the seed
            const newPlayerEntityPda = FindEntityPda({
                worldId: activeGames[0].worldId,
                entityId: new anchor.BN(0),
                seed: seed,
            });
            return newPlayerEntityPda;
        });
        
        // Set playerEntities.current to the list of playerEntityIds
        /*const entitiesToRemove = playerEntities.current.filter(
            (entity) => !playerEntityIds.includes(entity)
          );
          console.log('entitiesToRemove', entitiesToRemove, playerEntityIds, playerEntities.current);
          if (entitiesToRemove.length > 0) {
            setAllPlayers((prevPlayers) =>
            prevPlayers.filter(
                (player) => !entitiesToRemove.some((entity) => {
                    const seed = player.authority.toString().substring(0, 7);
                    const PlayerEntityPdaTemp = FindEntityPda({
                        worldId: activeGames[0].worldId,
                        entityId: new anchor.BN(0),
                        seed: seed,
                    });
    
                    return PlayerEntityPdaTemp === entity;
                })
            )
            );
          }*/
          
          playerEntities.current = playerEntityIds;
    
    }, [setPlayers, setCurrentPlayer, playerKey, food]);

    const updatePlayers = useCallback((player: any) => {
        //console.log('updating players')
        if (currentPlayer && player && player.authority && currentPlayer.authority) {
            //console.log(player)
            
            if (currentPlayer.authority && player.authority && currentPlayer.authority != player.authority) {
                //console.log('real', player)
                setAllPlayers((prevPlayers) => {
                    const playerIndex = prevPlayers.findIndex(p => p.authority.equals(player.authority));
                    const newPlayer: Blob = {
                        authority: player.authority,
                        x: player.x,
                        y: player.y,
                        radius: 4 + Math.sqrt(player.mass) * 6,
                        mass: player.mass,
                        score: player.score,
                        speed: player.speed,
                        charging: 0,
                    };   
                    if (playerIndex !== -1) {
                        // Replace the existing player
                        const updatedPlayers = [...prevPlayers];
                        updatedPlayers[playerIndex] = newPlayer
                        return updatedPlayers;
                    } else {
                        // Add the new player
                        return [...prevPlayers, newPlayer];
                    }
                });
            }
        }
    }, [setAllPlayers, screenSize, currentPlayer]);
    
    /*const updatePlayers = useCallback((players: any) => {
        let playersArray = players.players as any[];
        updateLeaderboard(playersArray);
        const currentPlayerData = playersArray.find(player => player.authority.equals(playerKey));
        
        if (!currentPlayerData) {
            setCurrentPlayer(null);
            setPlayers([]);
            setFood([]);
            console.error("Player eaten, not in game.");
            return;
        }
    
        const updateIntervals = 6; //9 
        const delay = 8; //8 
    
        const newCurrentPlayer = {
            authority: currentPlayerData.authority,
            x: currentPlayerData.x,
            y: currentPlayerData.y,
            radius: 4 + Math.sqrt(currentPlayerData.mass) * 6,
            mass: currentPlayerData.mass,
            score: currentPlayerData.score,
            speed: currentPlayerData.speed,
            charging: 0,
        } as Blob;
    
        const newVisiblePlayers: Blob[] = playersArray.reduce((accumulator: Blob[], player) => {
            if (!currentPlayer || !currentPlayer.authority.equals(player.authority)) {
                const halfWidth = screenSize.width / 2;
                const halfHeight = screenSize.height / 2;
                const diffX = (player.x - currentPlayerData.x);
                const diffY = (player.y - currentPlayerData.y);
    
                if (Math.abs(diffX) <= halfWidth && Math.abs(diffY) <= halfHeight) {
                    accumulator.push({
                        authority: player.authority,
                        x: diffX + screenSize.width / 2,
                        y: diffY + screenSize.height / 2,
                        radius: 4 + Math.sqrt(player.mass) * 6,
                        mass: player.mass,
                        score: player.score,
                        speed: player.speed,
                        charging: 0,
                    });
                }
            }
            return accumulator;
        }, []);
    
    
        for (let i = 0; i < updateIntervals; i++) {
            setTimeout(() => {
                setCurrentPlayer(currentPlayer => currentPlayer ? {
                    ...currentPlayer,
                    x: currentPlayer.x + ((newCurrentPlayer.x - currentPlayer.x) / updateIntervals),
                    y: currentPlayer.y + ((newCurrentPlayer.y - currentPlayer.y) / updateIntervals),
                } : newCurrentPlayer);
            
                setPlayers(players => players.map((vp, index) => {
                    const diffs = {
                            x: (newVisiblePlayers[index].x - vp.x) / updateIntervals,
                            y: (newVisiblePlayers[index].y - vp.y) / updateIntervals,
                        };
                    if (diffs) {
                        return {
                            ...vp,
                            x: vp.x + diffs.x,
                            y: vp.y + diffs.y,
                        };
                    }
                    return vp;
                }));
            }, delay);
        }
    }, [setPlayers, setCurrentPlayer, playerKey, food]);*/
    
    
    // Define callbacks function to handle account changes
    const handlePlayersComponentChange = useCallback((accountInfo: AccountInfo<Buffer>) => {
        const parsedData = playersComponentClient.current?.coder.accounts.decode("player1", accountInfo.data);
        updatePlayers(parsedData);
    }, [updatePlayers]);

    const handleFoodComponentChange = useCallback((accountInfo: AccountInfo<Buffer>) => {
        const parsedData = foodComponentClient.current?.coder.accounts.decode("section", accountInfo.data);
        updateFoodList(parsedData);
    }, [updateFoodList]);

    const handleMyPlayerComponentChange = useCallback((accountInfo: AccountInfo<Buffer>) => {
        const parsedData = playersComponentClient.current?.coder.accounts.decode("player1", accountInfo.data);
        updateMyPlayer(parsedData);
    }, [updateMyPlayer]);


    const handleMapComponentChange = useCallback((accountInfo: AccountInfo<Buffer>) => {
        const parsedData = mapComponentClient.current?.coder.accounts.decode("maplite", accountInfo.data);
        updateMap(parsedData);
    }, [updateMap]);


    // Subscribe to the game state
    const subscribeToGame = useCallback(async (): Promise<void> => {
        if (!entityMatch.current) return;
        if (!currentPlayerEntity.current) return;

        //console.log("Subscribing to game", entityMatch.current);

        playersComponentClient.current = await getComponentsClient(PLAYER_COMPONENT);
        foodComponentClient.current = await getComponentsClient(FOOD_COMPONENT);
        mapComponentClient.current = await getComponentsClient(MAP_COMPONENT);

        if (mapComponentSubscriptionId && mapComponentSubscriptionId.current) await  providerEphemeralRollup.connection.removeAccountChangeListener(mapComponentSubscriptionId.current);
        if (myplayerComponentSubscriptionId && myplayerComponentSubscriptionId.current) await  providerEphemeralRollup.connection.removeAccountChangeListener(myplayerComponentSubscriptionId.current);
        for (let i = 0; i < foodEntities.current.length; i++) {
            if (foodComponentSubscriptionId && foodComponentSubscriptionId.current) await  providerEphemeralRollup.connection.removeAccountChangeListener(foodComponentSubscriptionId.current[i]);
        }
        for (let i = 0; i < playerEntities.current.length; i++) {
            if (playersComponentSubscriptionId && playersComponentSubscriptionId.current) await  providerEphemeralRollup.connection.removeAccountChangeListener(playersComponentSubscriptionId.current[i]);
        }


        for (let i = 0; i < foodEntities.current.length; i++) {
            const foodComponenti = FindComponentPda({
                componentId: FOOD_COMPONENT,
                entity: foodEntities.current[i],
            });
            if (foodComponentSubscriptionId.current === null) {
                foodComponentSubscriptionId.current = [providerEphemeralRollup.connection.onAccountChange(foodComponenti, handleFoodComponentChange, 'processed')];
            } else {
                foodComponentSubscriptionId.current = [...foodComponentSubscriptionId.current, providerEphemeralRollup.connection.onAccountChange(foodComponenti, handleFoodComponentChange, 'processed')];
            }
            }   

        //console.log('Subscribe to players changes')
        for (let i = 0; i < playerEntities.current.length; i++) {
        const playersComponenti = FindComponentPda({
            componentId: PLAYER_COMPONENT,
            entity: playerEntities.current[i],
        });
        //console.log( i, playerEntities.current[i]);
        //console.log('player component', playersComponenti);
        if (playersComponentSubscriptionId.current === null) {
            playersComponentSubscriptionId.current = [providerEphemeralRollup.connection.onAccountChange(playersComponenti, handlePlayersComponentChange, 'processed')];
        } else {
            playersComponentSubscriptionId.current = [...playersComponentSubscriptionId.current,providerEphemeralRollup.connection.onAccountChange(playersComponenti, handlePlayersComponentChange, 'processed')];
        }
        }     
        
        const myplayerComponent = FindComponentPda({
            componentId: PLAYER_COMPONENT,
            entity: currentPlayerEntity.current,
        });
        
        myplayerComponentSubscriptionId.current = providerEphemeralRollup.connection.onAccountChange(myplayerComponent, handleMyPlayerComponentChange, 'processed');
        (playersComponentClient.current?.account as any).player1.fetch(myplayerComponent, "processed").then(updateMyPlayer).catch((error: any) => {
            console.error("Failed to fetch account:", error);
         });
        for (let i = 0; i < foodEntities.current.length; i++) {
            const foodComponenti = FindComponentPda({
                componentId: FOOD_COMPONENT,
                entity: foodEntities.current[i],
            });
            (foodComponentClient.current?.account as any).section.fetch(foodComponenti, "processed").then(updateFoodList).catch((error: any) => {
                console.error("Failed to fetch account:", error);
             });
        }

        for (let i = 0; i < playerEntities.current.length; i++) {
            const playersComponenti = FindComponentPda({
                componentId: PLAYER_COMPONENT,
                entity: playerEntities.current[i],
            });
            console.log( i, playerEntities.current[i]);
            console.log('player component', playersComponenti);
            (playersComponentClient.current?.account as any).player1.fetch(playersComponenti, "processed").then(updatePlayers).catch((error: any) => {
                console.error("Failed to fetch account:", error);
             });
        }    
        
        // Subscribe to grid changes
        const mapComponent = FindComponentPda({
            componentId: MAP_COMPONENT,
            entity: entityMatch.current,
        });
        mapComponentSubscriptionId.current = providerEphemeralRollup.connection.onAccountChange(mapComponent, handleMapComponentChange, 'processed');
        (mapComponentClient.current?.account as any).maplite.fetch(mapComponent, "processed").then(updateMap).catch((error: any) => {
            console.error("Failed to fetch account:", error);
         });
    }, [connection, handlePlayersComponentChange, handleMyPlayerComponentChange,handleFoodComponentChange, handleMapComponentChange, updatePlayers, updateFoodList, updateMap, updateMyPlayer]);

    const handleGameIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        try {
            //gameId.current = new PublicKey(newValue);
            setGameId(new PublicKey(newValue));
        } catch {
        }
    };
    const submitTransactionER = useCallback(async (transaction: Transaction, commitmetLevel: Commitment, skipPre: boolean): Promise<string | null> => {
        if (isSubmitting) return null;
        setIsSubmitting(true);
        setTransactionError(null);
        setTransactionSuccess(null);
        try {
            if (!walletRef.current) {
                throw new Error('Wallet is not initialized');
            }

            const signature = await providerEphemeralRollup.sendAndConfirm(transaction, [], { commitment: commitmetLevel }); 

            // Transaction was successful
            //console.log(`Transaction confirmed: ${signature}`);
            //setTransactionSuccess(`Transaction confirmed`);
            return signature;
        } catch (error) {
           // setTransactionError(`Transaction failed: ${error}`);
        } finally {
            setIsSubmitting(false);
        }
        return null;
    }, [connection, isSubmitting, sendTransaction]);

    const submitTransactionUser = useCallback(async (transaction: Transaction): Promise<string | null> => {
        if (isSubmitting) return null;
        setIsSubmitting(true);
        setTransactionError(null);
        setTransactionSuccess(null);
        try {
            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight }
            } = await connection.getLatestBlockhashAndContext();

            const signature = await sendTransaction(transaction, connection, { minContextSlot});
            await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, "processed");

            // Transaction was successful
            console.log(`Transaction confirmed: ${signature}`);
            setTransactionSuccess(`Transaction confirmed`);
            return signature;
        } catch (error) {
            setTransactionError(`Transaction failed: ${error}`);
        } finally {
            setIsSubmitting(false);
        }
        return null;
    }, [connection, isSubmitting, sendTransaction]);

    const submitTransaction = useCallback(async (transaction: Transaction, commitmetLevel: Commitment, skipPre: boolean): Promise<string | null> => {
        if (isSubmitting) return null;
        setIsSubmitting(true);
        setTransactionError(null);
        setTransactionSuccess(null);
        try {
            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight }
            } = await provider.connection.getLatestBlockhashAndContext();

            if (!walletRef.current) {
                throw new Error('Wallet is not initialized');
            }
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = walletRef.current.publicKey;
            transaction.sign(walletRef.current);

            const signature = await provider.connection.sendRawTransaction(transaction.serialize(), {
              skipPreflight: skipPre,
              preflightCommitment: commitmetLevel,
            });
            //const signature = await sendTransaction(transaction, connection, { minContextSlot});
            await provider.connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, commitmetLevel);

            // Transaction was successful
           // console.log(`Transaction confirmed: ${signature}`);
            setTransactionSuccess(`Transaction confirmed`);
            return signature;
        } catch (error) {
            setTransactionError(`Transaction failed: ${error}`);
        } finally {
            setIsSubmitting(false);
        }
        return null;
    }, [connection, isSubmitting, sendTransaction]);

    /**
     * Create a new game transaction
     */
    const newGameTx = useCallback(async (width: number, height: number, entry_fee: number, max_players: number, emit_type: number, emit_data: number, frozen: boolean) => {
        if (!publicKey) throw new WalletNotConnectedError();

        /*const registryPda = FindRegistryPda({programId: MAP_COMPONENT});
        const initializeRegistryIx = createInitializeRegistryInstruction({
          registry: registryPda,
          payer: provider.wallet.publicKey,
        });
        const tx = new anchor.web3.Transaction().add(initializeRegistryIx);
        await provider.sendAndConfirm(tx);*/

        const initNewWorld = await InitializeNewWorld({
            payer:  publicKey, //playerKey,
            connection: connection,
          });
        const txSign = await submitTransactionUser(initNewWorld.transaction); //submitTransaction(initNewWorld.transaction, "processed", false);
        const worldPda = initNewWorld.worldPda;
        // Create the entity
        /*const addEntity = await AddEntity({
            payer: publicKey,
            world: worldPda,
            connection: connection,
        });
        const transaction = addEntity.transaction;*/

        const mapseed = "origin"; // There is a current limitation on the size of the seeds, will be increased
        const newmapentityPda = FindEntityPda({
            worldId: initNewWorld.worldId,
            entityId: new anchor.BN(0),
            seed: mapseed
        })
        const addMapEntityIx = await createAddEntityInstruction(
            {
                payer: publicKey,
                world: worldPda,
                entity: newmapentityPda,
            },
            { extraSeed: mapseed }
        )
        const transaction = new anchor.web3.Transaction().add(addMapEntityIx);
        //entityMatch.current = addEntity.entityPda;
        //gameId.current = addEntity.entityPda;
        
        const seed = "11111111111111111111"; // There is a current limitation on the size of the seeds, will be increased
        const newfoodEntityPda = FindEntityPda({
            worldId: initNewWorld.worldId,
            entityId: new anchor.BN(0),
            seed: seed
        })
        const addEntityIx = await createAddEntityInstruction(
            {
                payer: publicKey,
                world: worldPda,
                entity: newfoodEntityPda,
            },
            { extraSeed: seed }
        )
        transaction.add(addEntityIx)

        console.log('food id', newfoodEntityPda.toString())
        const initMapIx = await InitializeComponent({
            payer: publicKey,
            entity: newmapentityPda,
            componentId: MAP_COMPONENT,
        });
        
        const initComponent = await InitializeComponent({
            payer: publicKey,
            entity: newfoodEntityPda,
            componentId: FOOD_COMPONENT,
          });

        //transaction.add(initMapIx.transaction);
        //transaction.add(initPlayersIx.transaction);
        //const component_signature =  await submitTransactionUser(transaction); //await submitTransaction(transaction, "processed", false); //await provider.sendAndConfirm(transaction); 
        //console.log(
        //    `Initialized components signature: ${component_signature}`
        //);

        console.log(
            width,
            height,
            entry_fee,
            max_players,
            emit_type,
            emit_data,
            frozen,
        )
        const initGame = await ApplySystem({
            authority: publicKey,
            entities: [
              {
                entity: newmapentityPda,
                components: [{ componentId: MAP_COMPONENT }],
              },
            ],
            systemId: INIT_GAME,
            args: {
                name:"test",
                width: width,
                height: height,
                entry_fee: entry_fee,
                max_players: max_players,
                emit_type: emit_type,
                emit_data: emit_data,
                frozen: frozen,
            },
          });
          transaction.add(initMapIx.transaction);
          transaction.add(initComponent.transaction);
          transaction.add(initGame.transaction);

        const signature = await submitTransactionUser(transaction); //await submitTransaction(initGame.transaction, "processed", false); // providerEphemeralRollup.sendAndConfirm(initGame.transaction);
        if (signature != null) {
            setCreatingGame(false);
            const newGameInfo : ActiveGame = {worldId: initNewWorld.worldId, worldPda: initNewWorld.worldPda}
            console.log('new game info', newGameInfo.worldId,newGameInfo.worldPda.toString(), newmapentityPda)
            setNewGameCreated(newGameInfo);
            //entityMatch.current = newmapentityPda;
            const copiedActiveGameIds: ActiveGame[] = [...activeGames];
            copiedActiveGameIds.push(newGameInfo);  
            setActiveGames(copiedActiveGameIds);
            console.log(newmapentityPda, newmapentityPda.toString());
            //console.log(mapParsedData);
            //(mapComponentClientTemp.account as any).maplite.fetch(newmapentityPda, "processed").then(updateMap);
        }
    }, [playerKey, connection]);
    /**
     * Create a new join game transaction
     */
    const joinGameTx = useCallback(async (selectGameId: ActiveGame) => {
        if (!playerKey) throw new WalletNotConnectedError();
        //if (!entityMatch.current) throw new WalletNotConnectedError(); 

        const gameInfo = selectGameId; 

        const mapseed = "origin"; // There is a current limitation on the size of the seeds, will be increased
        const mapEntityPda = FindEntityPda({
            worldId: gameInfo.worldId,
            entityId: new anchor.BN(0),
            seed: mapseed
        })
        
        //console.log('map settings',currentMap)
        entityMatch.current = mapEntityPda;

        const foodseed = "11111111111111111111"; // There is a current limitation on the size of the seeds, will be increased
        const foodEntityPda =  FindEntityPda({
            worldId: gameInfo.worldId,
            entityId: new anchor.BN(0),
            seed: foodseed
        })
    
        //await subscribeToGame();
        if(!delegationDone){
            const mapComponentPda = FindComponentPda({
                componentId: MAP_COMPONENT,
                entity: mapEntityPda,
            });
            const mapdelegateIx = createDelegateInstruction({
            entity: mapEntityPda,
            account: mapComponentPda,
            ownerProgram: MAP_COMPONENT,
            payer: playerKey,
            });
            const maptx = new anchor.web3.Transaction().add(mapdelegateIx);
            //const mapdelsignature = await submitTransaction(maptx, "processed", true); //provider.sendAndConfirm(maptx, [], { skipPreflight: true, commitment: 'finalized' }); 
            //console.log(
            //    `Delegation signature: ${mapdelsignature}`
            //);
            const foodComponentPda = FindComponentPda({
                componentId: FOOD_COMPONENT,
                entity: foodEntityPda,
            });
            const fooddelegateIx = createDelegateInstruction({
            entity: foodEntityPda,
            account: foodComponentPda,
            ownerProgram: FOOD_COMPONENT,
            payer: playerKey,
            });
            maptx.add(fooddelegateIx);
            const delsignature = await submitTransaction(maptx, "finalized", true); //provider.sendAndConfirm(playertx, [], { skipPreflight: true, commitment: 'finalized' }); 
            console.log(
                `Delegation signature: ${delsignature}`
            );
            
            //await subscribeToGame();
            let seednum = 0;
            console.log(playerEntities.current.length);
            const mapComponentClient= await getComponentsClient(MAP_COMPONENT);
            const mapacc = await providerEphemeralRollup.connection.getAccountInfo(
            mapComponentPda
            );
            console.log(mapacc)
            console.log(mapComponentClient)
            if(mapacc){
            const mapParsedData = mapComponentClient.coder.accounts.decode("maplite", mapacc.data);
            console.log(mapParsedData);
             seednum = mapParsedData.players.length;
            }
            
            const playerseed = playerKey.toString().substring(0, 7); //'player-' +  seednum.toString(); // There is a current limitation on the size of the seeds, will be increased
            console.log(playerseed)
            const newplayerEntityPda =  FindEntityPda({
                worldId: gameInfo.worldId,
                entityId: new anchor.BN(0),
                seed: playerseed
            })
            const addEntityIx = await createAddEntityInstruction(
                {
                    payer: playerKey,
                    world: gameInfo.worldPda,
                    entity: newplayerEntityPda,
                },
                { extraSeed: playerseed }
            )
    
            const tx = new anchor.web3.Transaction().add(addEntityIx);
            //const txSign = await provider.sendAndConfirm(tx);
            const initComponent = await InitializeComponent({
                payer: playerKey,
                entity: newplayerEntityPda,
                componentId: PLAYER_COMPONENT,
              });
             // const txSign = await provider.sendAndConfirm(initComponent.transaction);
              tx.add(initComponent.transaction);
              const txSign = await submitTransaction(tx, "finalized", true); //await provider.sendAndConfirm(tx);
              console.log()
                //playerEntityPda = newplayerEntityPda;
                console.log(
                    ` new player signature: ${txSign}`
                );

                const playerComponentPda = FindComponentPda({
                    componentId: PLAYER_COMPONENT,
                    entity: newplayerEntityPda,
                });
                const playerdelegateIx = createDelegateInstruction({
                entity: newplayerEntityPda,
                account: playerComponentPda,
                ownerProgram: PLAYER_COMPONENT,
                payer: playerKey,
                });
                const playertx = new anchor.web3.Transaction().add(playerdelegateIx);
                const playerdelsignature = await submitTransaction(playertx, "finalized", true); //provider.sendAndConfirm(playertx, [], { skipPreflight: true, commitment: 'finalized' }); 
                console.log(
                    `Delegation signature: ${playerdelsignature}`
                );

            console.log('join game', gameInfo.worldId.toString(), newplayerEntityPda.toString(), foodEntityPda.toString(),mapEntityPda.toString())
            const applySystem = await ApplySystem({
                authority: playerKey,
                entities: [
                  {
                    entity: newplayerEntityPda,
                    components: [{ componentId:PLAYER_COMPONENT}],
                  },
                  {
                    entity: foodEntityPda,
                    components: [{ componentId:FOOD_COMPONENT}],
                  },
                  {
                    entity: mapEntityPda,
                    components: [{ componentId:MAP_COMPONENT }],
                  },
                ],
                systemId: JOIN_GAME,
              });
              console.log(applySystem)
            const transaction = applySystem.transaction;
            const signature = await providerEphemeralRollup.sendAndConfirm(applySystem.transaction);   //submitTransactionER(transaction, "processed", false); 
            console.log(signature)
            if (signature != null) {
                setGameId(mapEntityPda);
                setDelegationDone(true);
                entityMatch.current = mapEntityPda;
                currentPlayerEntity.current = newplayerEntityPda;
                foodEntities.current = [...foodEntities.current, foodEntityPda];
                await subscribeToGame();
            }
        }else{
            const playerseed = playerKey.toString().substring(0, 7); //'player-' +  seednum.toString(); // There is a current limitation on the size of the seeds, will be increased
            console.log(playerseed)
            const newplayerEntityPda =  FindEntityPda({
                worldId: gameInfo.worldId,
                entityId: new anchor.BN(0),
                seed: playerseed
            })
           const applySystem = await ApplySystem({
                authority: playerKey,
                entities: [
                  {
                    entity: newplayerEntityPda,
                    components: [{ componentId:PLAYER_COMPONENT}],
                  },
                  {
                    entity: foodEntityPda,
                    components: [{ componentId:FOOD_COMPONENT}],
                  },
                  {
                    entity: mapEntityPda,
                    components: [{ componentId:MAP_COMPONENT }],
                  },
                ],
                systemId: JOIN_GAME, 
              });
            const transaction = applySystem.transaction;
            const signature = await submitTransactionER(transaction, "processed", false); //providerEphemeralRollup.sendAndConfirm(applySystem.transaction); 
            if (signature != null) {
                setGameId(mapEntityPda);
                entityMatch.current = mapEntityPda;
                currentPlayerEntity.current = newplayerEntityPda;
                foodEntities.current = [...foodEntities.current, foodEntityPda];
                await subscribeToGame();
            }
        }
    }, [playerKey, submitTransaction, subscribeToGame]);

    const exitGameTx = useCallback(async () => {
        if (!playerKey) throw new WalletNotConnectedError();
        if (gameId == null) setTransactionError("Not connected to game");
        const player_entity = currentPlayerEntity.current as PublicKey;
        const map_entity = entityMatch.current as PublicKey;
        const applySystem = await ApplySystem({
            authority: playerKey,
            entities: [
              {
                entity: player_entity,
                components: [{ componentId: PLAYER_COMPONENT }],
              },
              {
                entity: map_entity,
                components: [{ componentId: MAP_COMPONENT }],
              },
            ],
            systemId: EXIT_GAME,
        });
        const transaction = applySystem.transaction;
        console.log('exiting')
        currentPlayerEntity.current = null;
        entityMatch.current = null;
        setGameId(null);
        const signature = await submitTransactionER(transaction, "processed", false);  //providerEphemeralRollup.sendAndConfirm(transaction); 
        console.log(signature)
        if (signature != null) {
            entityMatch.current = null;
            setGameId(null);
            /*
            const mapComponentPda = FindComponentPda({
            componentId: MAP_COMPONENT,
            entity: entity,
            });
            const mapallowUndelegateIx = createAllowUndelegationInstruction({
            delegatedAccount: mapComponentPda,
            ownerProgram: MAP_COMPONENT,
            });
            const mapundelegateIx = createUndelegateInstruction({
            payer: provider.wallet.publicKey,
            delegatedAccount: mapComponentPda,
            ownerProgram: MAP_COMPONENT,
            reimbursement: provider.wallet.publicKey,
            });
            const mapdegtx = new anchor.web3.Transaction()
                .add(mapallowUndelegateIx)
                .add(mapundelegateIx);
            await submitTransaction(mapdegtx, "processed", true);  //provider.sendAndConfirm(mapdegtx, [], { skipPreflight: true });
        
            const playersComponentPda = FindComponentPda({
              componentId: PLAYERS_COMPONENT,
              entity: entity,
            });
            const playersallowUndelegateIx = createAllowUndelegationInstruction({
              delegatedAccount: playersComponentPda,
              ownerProgram: PLAYERS_COMPONENT,
            });
            const playersundelegateIx = createUndelegateInstruction({
              payer: provider.wallet.publicKey,
              delegatedAccount: playersComponentPda,
              ownerProgram: PLAYERS_COMPONENT,
              reimbursement: provider.wallet.publicKey,
            });
            const playersdegtx = new anchor.web3.Transaction()
                .add(playersallowUndelegateIx)
                .add(playersundelegateIx);

            await submitTransaction(playersdegtx, "processed", true); //provider.sendAndConfirm(playersdegtx, [], { skipPreflight: true });
            */
        }

    }, [playerKey, submitTransaction, subscribeToGame]);

    useEffect(() => {
        if(currentPlayer){
        const visibleFood = food.reduce<Food[]>((accumulator, foodItem) => {
            const diffX = foodItem.x - currentPlayer.x;
            const diffY = foodItem.y - currentPlayer.y;
            //console.log(currentPlayer, diffX, diffY) 
            if (Math.abs(diffX) <= screenSize.width/2 && Math.abs(diffY) <= screenSize.height/2) {
              // Food is visible, adjust position
              accumulator.push({
                x: foodItem.x - currentPlayer.x + screenSize.width/2,
                y: foodItem.y - currentPlayer.y + screenSize.height/2
              });
            }
            return accumulator;
        }, []);
        setVisibleFood(visibleFood);
        //console.log(`food length: ${food.length}, visible food length: ${visibleFood.length}`);
        }
    }, [food,currentPlayer]);

    // Function to handle movement and charging
    const handleMovementAndCharging = async () => {
        if (playerKey && currentPlayer && currentPlayer.authority && entityMatch.current && gameId && currentPlayerEntity.current) {
            try {
                const entity = gameId as PublicKey;
                let mouseX = mousePosition.x;
                let mouseY = mousePosition.y;
                const newX = Math.floor(currentPlayer.x + mouseX - window.innerWidth / 2);
                const newY = Math.floor(currentPlayer.y + mouseY - window.innerHeight / 2);
                //const startTime = performance.now(); // Capture start time
                setConfirmedXY({mouseX,mouseY})
                //console.log(mousePosition.x, mousePosition.y);
                //console.log(currentPlayer.x, currentPlayer.y, newX, newY, entity);
                let foodtoeat = checkFoodDistances(visibleFood, screenSize);
                //let playerstoeat = checkPlayerDistances(players, screenSize);

                const alltransaction = new anchor.web3.Transaction();

                if(foodtoeat){
                    const eatFoodTx = await ApplySystem({
                        authority: playerKey,
                        entities: [
                                {
                                entity: currentPlayerEntity.current,
                                components: [{ componentId: PLAYER_COMPONENT }],
                              },
                              {
                                entity: foodEntities.current[0],
                                components: [{ componentId: FOOD_COMPONENT }],
                              },
                              {
                                entity: entityMatch.current,
                                components: [{ componentId: MAP_COMPONENT }],
                              },
                        ],
                        systemId: EAT_FOOD,
                    });
                    
                    alltransaction.add(eatFoodTx.transaction);
                }
                /*if(playerstoeat){
                    const playerseed = playerstoeat.toString().substring(0, 7); //'player-' +  seednum.toString(); // There is a current limitation on the size of the seeds, will be increased
                    const newplayerEntityPda =  FindEntityPda({
                        worldId: activeGames[0].worldId,
                        entityId: new anchor.BN(0),
                        seed: playerseed
                    })
                    const eatPlayerTx = await ApplySystem({
                        authority: playerKey,
                        entities: [
                                {
                                entity: currentPlayerEntity.current,
                                components: [{ componentId: PLAYER_COMPONENT }],
                              },
                              {
                                entity: newplayerEntityPda,
                                components: [{ componentId: PLAYER_COMPONENT }],
                              },
                              {
                                entity: entityMatch.current,
                                components: [{ componentId: MAP_COMPONENT }],
                              },
                        ],
                        systemId: EAT_FOOD,
                    });
                    
                    alltransaction.add(eatPlayerTx.transaction);
                }*/
                const makeMove = await ApplySystem({
                    authority: playerKey,
                    entities: [
                      {
                        entity: currentPlayerEntity.current,
                        components: [{ componentId: PLAYER_COMPONENT }],
                      },
                      {
                        entity: foodEntities.current[0],
                        components: [{ componentId: FOOD_COMPONENT }],
                      },
                      {
                        entity: entityMatch.current,
                        components: [{ componentId: MAP_COMPONENT }],
                      },
                    ],
                    systemId: MOVEMENT,
                    args: {
                        x: newX,
                        y: newY,
                        boost: isMouseDown,
                    },
                });
                
                let transaction = makeMove.transaction;
                alltransaction.add(transaction);
                // Optional: Add additional systems or components to the transaction
                // if (charging !== null) {
                //     setCharging(null);
                //     const chargeSystem = await ApplySystem({
                //         authority: publicKey,
                //         system: CHARGE_ATTACK,
                //         entity: entity,
                //         components: [PLAYERS_COMPONENT, MAP_COMPONENT],
                //     });
                //     if (chargeSystem.transaction) {
                //         transaction.add(chargeSystem.transaction);
                //     }
                // }

                let signature = await providerEphemeralRollup.sendAndConfirm(alltransaction).catch((error) => {
                    throw error;
                }); //await submitTransactionER(transaction, "processed", false); 
                //console.log(`Movement signature: ${signature}, ${confirmedXY}`);
                if (signature != null) {  
                    //const endTime = performance.now();  // Capture end time
                    //const elapsedTime = endTime - startTime; // Calculate elapsed time
                    //console.log(`Time between setConfirmedXY and reset: ${elapsedTime} ms`);
                    await subscribeToGame();
                    /*const playersComponent = FindComponentPda({
                        componentId: PLAYER_COMPONENT,
                        entity: entityMatch.current,
                    });
                    const mapComponent = FindComponentPda({
                        componentId: MAP_COMPONENT,
                        entity: entityMatch.current,
                    });
                    (playersComponentClient.current?.account as any).players.fetch(playersComponent, "processed").then(updatePlayers);
                    (mapComponentClient.current?.account as any).map.fetch(mapComponent, "processed").then(updateFoodList);*/
                    setConfirmedXY(null);
                }
            } catch (error) {
                setIsSubmitting(false);
                console.error("Failed to execute system or submit transaction:", error);
            }
        }
    };
    
    useEffect(() => {
        const intervalId = setInterval(() => {
            handleMovementAndCharging();
        }, 73); //20 

        return () => clearInterval(intervalId); // Cleanup interval on unmount
       // handleMovementAndCharging();
    }, [playerKey, gameId, entityMatch, currentPlayer]);

    const checkPlayerDistances = (visiblePlayers: Blob[], screenSize: { width: number, height: number }) => {
        const centerX = screenSize.width / 2;
        const centerY = screenSize.height / 2;
    
        for (const player of visiblePlayers) {
            const distance = Math.sqrt((player.x - centerX) ** 2 + (player.y - centerY) ** 2);
            if (distance < 100) {
                return player.authority;
            }
        }
        return null; // or undefined, depending on your preference
    };

    const checkFoodDistances = (visibleFood: { x: number, y: number }[], screenSize: { width: number, height: number }) => {
        const centerX = screenSize.width / 2;
        const centerY = screenSize.height / 2;
        
        return visibleFood.some(food => {
            const distance = Math.sqrt((food.x - centerX) ** 2 + (food.y - centerY) ** 2);
            return distance < 100;
        });
    };
    
    /*const handleEating = async () => {
        let foodtoeat = checkFoodDistances(visibleFood, screenSize);
        let playerstoeat = checkFoodDistances(players, screenSize);
        if(foodtoeat){
            if (playerKey && currentPlayer && entityMatch.current && currentPlayerEntity.current) {
            try {
                const entity = gameId as PublicKey;
                const makeMove = await ApplySystem({
                    authority: playerKey,
                    entities: [
                            {
                            entity: currentPlayerEntity.current,
                            components: [{ componentId: PLAYER_COMPONENT }],
                          },
                          {
                            entity: foodEntities.current[0],
                            components: [{ componentId: FOOD_COMPONENT }],
                          },
                          {
                            entity: entityMatch.current,
                            components: [{ componentId: MAP_COMPONENT }],
                          },
                    ],
                    systemId: EAT_FOOD,
                });
                
                let transaction = makeMove.transaction;

                let signature = await providerEphemeralRollup.sendAndConfirm(transaction).catch((error) => {
                    throw error;
                }); 
                console.log('eating'); 
            } catch (error) {
                setIsSubmitting(false);
                console.error("Failed to execute system or submit transaction:", error);
            }
        }
        else{
            console.log("no food");
        }
        }
    };
    
    useEffect(() => {
        const intervalId = setInterval(() => {
            handleEating();
        }, 73); //20 

        return () => clearInterval(intervalId); // Cleanup interval on unmount
    }, [playerKey, currentPlayer, entityMatch, gameId]); */

    /*const getGameData = async () => {
        await subscribeToGame();
    }

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (currentPlayer) {
                getGameData();
            }
        }, 10);

        return () => clearInterval(intervalId);
    }, [playerKey, currentPlayer, entityMatch, gameId]);*/

    // Animation logic
    const animateMovement = (
            targetX: number,
            targetY: number,
            playerX: number,
            playerY: number,
            playerSpeed: number,
            playerMass: number
        ) => {
        function calculateMovement(
            targetX: number,
            targetY: number,
            playerX: number,
            playerY: number,
            playerSpeed: number,
            playerMass: number
        ) {
            let dx = targetX - playerX;
            let dy = targetY - playerY;
            let dist = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
            let deg = Math.atan2(dy, dx);
        
            let slowDown = 1.0;
            if (playerSpeed <= 6.25) {
                slowDown = Math.log(playerMass / 10.0) / 1.504 - 0.531;
            }
        
            let deltaY = ((playerSpeed * Math.sin(deg)) / slowDown);
            let deltaX = ((playerSpeed * Math.cos(deg)) / slowDown);
            return { deltaX, deltaY };
        }

        const { deltaX, deltaY } = calculateMovement(targetX, targetY, playerX, playerY, playerSpeed, playerMass);
        if (currentPlayer) {
            //set copy input = playerX
            currentPlayer.x += deltaX;
            currentPlayer.y += deltaY;
            setCurrentPlayer({ ...currentPlayer });
        }
        /*
        let currentFrame = 0;

        const FPS = 60;
        const ANIMATION_DURATION = 80; // in milliseconds
        const FRAMES = (ANIMATION_DURATION / 1000) * FPS;

        const animate = () => {
            if (confirmedXY && currentFrame < FRAMES) {
                if (currentPlayer) {
                    currentPlayer.x += deltaX / FRAMES;
                    currentPlayer.y += deltaY / FRAMES;
                    setCurrentPlayer({ ...currentPlayer });
                }
                currentFrame++;
                requestAnimationFrame(animate);
            }
        };

        animate();*/
    };

    useEffect(() => {
        if(entityMatch || gameId || currentPlayer){ 
            /*
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.code === 'Space' || event.key === ' ') {
                    setCharging(true);
                }
            };
            const handleKeyUp = (event: KeyboardEvent) => {
                if (event.code === 'Space' || event.key === ' ') {
                    setCharging(false);
                }
            };  */
            const handleMouseMove = (event: MouseEvent) => {
                setMousePosition({x:event.clientX, y: event.clientY}); 
            }; 

            const handleMouseDown = (event: MouseEvent) => { 
                setIsMouseDown(true);
                setMousePosition({x:event.clientX, y: event.clientY}); 
            };

            const handleMouseUp = () => {
                setIsMouseDown(false);
            };
            
            window.addEventListener('mousedown', handleMouseDown);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('mousemove', handleMouseMove); 
            //window.addEventListener('keydown', handleKeyDown);
            //window.addEventListener('keyup', handleKeyUp);

            return () => {
                //window.removeEventListener('keyup', handleKeyUp);
                //window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mousedown', handleMouseDown);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [playerKey, gameId, entityMatch, currentPlayer]);  

    useEffect(() => {
        if(gameId){ 
            /*
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.code === 'Space' || event.key === ' ') {
                    setCharging(true);
                }
            };
            const handleKeyUp = (event: KeyboardEvent) => {
                if (event.code === 'Space' || event.key === ' ') {
                    setCharging(false);
                }
            }; */
            const handleMouseMove = (event: MouseEvent) => {
                setMousePosition({x:event.clientX, y: event.clientY}); 
            };  

            const handleMouseDown = (event: MouseEvent) => { 
                setIsMouseDown(true);
                setMousePosition({x:event.clientX, y: event.clientY}); 
            };

            const handleMouseUp = () => {
                setIsMouseDown(false);
            };
            
            window.addEventListener('mousedown', handleMouseDown);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('mousemove', handleMouseMove); 
            //window.addEventListener('keydown', handleKeyDown);
            //window.addEventListener('keyup', handleKeyUp);

            return () => {
                //window.removeEventListener('keyup', handleKeyUp);
                //window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mousedown', handleMouseDown);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
            
        function translateLargerRectangle() {
            const largerRectangle = document.getElementsByClassName('game')[0] as HTMLElement;;
            const smallerRectangle = document.getElementsByClassName('gameWrapper')[0] as HTMLElement;;
        
            // Check if the elements exist
            if (largerRectangle && smallerRectangle) {
                // Get the dimensions of the rectangles
                const widthLarger = screenSize.width*scale; //largerRectangle.offsetWidth;
                const heightLarger = screenSize.height*scale; //largerRectangle.offsetHeight;
                const widthSmaller = smallerRectangle.offsetWidth;
                const heightSmaller = smallerRectangle.offsetHeight;
                //console.log(widthLarger,heightLarger,widthSmaller,heightSmaller)
                // Calculate the translation distances
                const deltaX = (widthSmaller / 2) - (widthLarger / 2);
                const deltaY = (heightSmaller / 2) - (heightLarger / 2);
        
                // Set the transform property to translate the rectangle
                largerRectangle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            } else {
                console.error('Elements with class name "gameWrapper" or "game" not found.');
            }
        }
        // Call the function to translate the rectangle
        translateLargerRectangle();
        
    }, [gameId, setGameId]);  

    // Function to send SOL
    async function sendSol(destWallet: PublicKey) {
        const privateKey = "FSYbuTybdvfrBgDWSHuZ3F3fMg7mTZd1pJSPXHM6QkamDbbQkykV94n3y8XhLwRvuvyvoUmEPJf9Qz8abzaWBtv"; //process.env.PRIVATE_KEY;
        if (!privateKey || !destWallet) {
            throw new Error("Key is not defined in the environment variables");
        }

        const secretKey = bs58.decode(privateKey); //Uint8Array.from(JSON.parse(privateKey));
        const senderKeypair = Keypair.fromSecretKey(secretKey);
        const recipientPublicKey = destWallet;
        const senderPublicKey = senderKeypair.publicKey;

        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight }
        } = await connection.getLatestBlockhashAndContext();
        const transaction = new Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = senderPublicKey;
        transaction.add(SystemProgram.transfer({
            fromPubkey: senderPublicKey,
            toPubkey: recipientPublicKey,
            lamports: 0.2 * LAMPORTS_PER_SOL, // Amount in SOL (1 SOL in this example)
        }));

        transaction.sign(senderKeypair);
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'processed',
        });

        // Confirm the transaction
        await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, "processed");

        console.log('Transaction successful with signature:', signature);
    }

    useEffect(() => {
        const createWalletAndRequestAirdrop = async () => {    
          // Request an airdrop of 1 SOL
          //const airdropSignature = await connection.requestAirdrop(
          //  wallet.publicKey,
          //  LAMPORTS_PER_SOL
          //);
          sendSol(walletRef.current.publicKey).catch(console.error);
          //const balance = await connection.getBalance(walletRef.current.publicKey);
          //console.log(playerKey?.toString(), balance) 
        };
    
        createWalletAndRequestAirdrop();
      }, []);
      
      /*useEffect(() => {
        const getBalance = async () => {
            if(playerKey){
                const balance = await connection.getBalance(playerKey);
                console.log(playerKey?.toString(), balance);
            }
        };
    
        getBalance();
      }, []);*/
      
      useEffect(() => {
        const getTPS = async () => {
            if(playerKey){
                const recentSamples = await connection.getRecentPerformanceSamples(4);
                const totalTransactions = recentSamples.reduce((total, sample) => total + sample.numTransactions, 0);
                const averageTransactions = totalTransactions / recentSamples.length;
                setCurrentTPS(Math.round(averageTransactions));
                //console.log(recentSamples[0].numTransactions);
            }
        };
            
        getTPS();
      }, []);

        useEffect(() => {
            const fetchPrice = async () => {
                try {
                const response = await fetch('https://api.raydium.io/v2/main/price');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                const specificPrice = data["So11111111111111111111111111111111111111112"];
                setPrice(specificPrice); // Set the specific price to the state
                } catch (error) {
                console.error('Error fetching the price:', error);
            }
        };
    
        fetchPrice();
        }, []);
        useEffect(() => {
            // Initialize openGameInfo with a list of false values
            setOpenGameInfo(new Array(activeGameIds.length).fill(false));
          }, [activeGameIds]);

        const handleClick = (index: number) => {
        setOpenGameInfo(prevState => {
            const newState = [...prevState];
            newState[index] = !newState[index];
            return newState;
        });
        };
        useEffect(() => {
        const renderPanel = (buildViewer: number) => {
            switch (buildViewer) {
              case 1:
                return (
                  <div className="panel" style={{ display: "flex", justifyContent: 'center', width: "100%", height: "100%", color:"white" }}>
                    <div style={{ marginTop: "1vw", width: "60%" }}>
                      <h1 style={{ marginTop: "2vw", marginBottom: "2vw", marginLeft: "1.5vw", fontFamily: "conthrax", fontSize: "36px" }}>Launch Your Game</h1>
                      <p style={{ marginLeft: "1.5vw", fontFamily: "terminus", fontSize: "20px", width: "80%" }}>
                          Deploy and customize your own Supersize game. <br /><br />
                        <span style={{ opacity: "0.7" }}>
                          Supersize is compatible with all SPL tokens. 
                          Deploying a game generates a new Supersize world that lives forever and is owned by you. 
                          Game deployment costs 0.2 sol. Your wallet receives 80% of all fees generated by your game.
                        </span>
                        <br /><br />
                         <span className="free-play" style={{display:newGameCreated?'flex':'none', width: 'fit-content', padding:"10px", fontSize:"15px", marginTop:"1vh"}}>New Game ID: {newGameCreated?.worldPda.toString()}</span>
                      </p>
                    </div>
                    <div style={{ marginRight: "1.5vw", marginTop:"3vw" }}>
                      <CreateGame initFunction={newGameTx} />
                    </div>
                  </div>
                );
              case 2:
                return (
                  <div className="panel" style={{ display: "flex", justifyContent: 'center', width: "100%", height: "100%", color:"white" }}>
                    <div style={{ marginTop: "2vw", width: "60%" }}>
                    <h1 style={{ margin: "2vw", marginLeft:"4vw", fontFamily: "conthrax", fontSize: "36px" }}>Earn Fees</h1>
                    <p style={{ marginLeft: "4vw", fontFamily: "terminus", fontSize: "20px", width: "80%" }}>
                      A 1% protocol fee is charged on each Supersize buy-in. 80% of the protocol fee goes to the game owner, 
                      20% goes to Supersize Inc. Fees accumulate in each game’s chosen SPL token.
                    </p>
                    </div>
                    <img src={`${process.env.PUBLIC_URL}/Group6.png`} width="100vw" height="auto" alt="Image" style={{ width: "25vw",height: "25vw", marginRight:"1vw", alignSelf:"center" }}/>
                  </div>
                );
              case 3:
                return (
                  <div className="panel" style={{display: "flex", width: "100%", height: "100%", color:"white", flexDirection:"column" }}>
                    <h1 style={{ margin: "2vw", marginLeft: "2vw", fontFamily: "conthrax", fontSize: "35px" }}>Mod Your Game</h1>
                    <p style={{ marginLeft: "2vw", fontFamily: "terminus", fontSize: "24px", width: "80%" }}>
                      Make your game stand out. Add everything from custom features and gameplay mechanics to in-game drops.
                      Supersize is a realtime fully onchain game powered by Magicblock engine. 
                      <br /><br />
                      Here are some resources to start modding realtime FOC games: 
                    </p>
                    <div style={{display: "flex", flexDirection:"column", marginLeft:"2vw", marginTop:"1vw"}}>
                    <div style={{display: "flex", flexDirection:"row", color:"white", alignItems:"center"}}><img style={{marginTop:"1vw"}} src={`${process.env.PUBLIC_URL}/Logomark_white.png`} width="30vw" height="auto" alt="Image" /> <a style={{marginTop:"20px", marginLeft:"1vw", cursor:"pointer"}} onClick={() => {window.open('https://docs.magicblock.gg/Forever%20Games', '_blank');}}> docs.magicblock.gg/Forever%20Games </a></div>
                    <div style={{display: "flex", flexDirection:"row", color:"white", alignItems:"center"}}><img style={{marginTop:"1vw"}} src={`${process.env.PUBLIC_URL}/GitBook.png`} width="30vw" height="auto" alt="Image" /> <a style={{marginTop:"10px", marginLeft:"1vw", cursor:"pointer"}} onClick={() => {window.open('https://docs.supersize.app', '_blank');}}> docs.supersize.app</a></div>
                    <div style={{display: "flex", flexDirection:"row", color:"white", alignItems:"center"}}><img style={{marginTop:"1vw"}} src={`${process.env.PUBLIC_URL}/github-mark-white.png`} width="30vw" height="auto" alt="Image" /> <a style={{marginTop:"10px", marginLeft:"1vw", cursor:"pointer"}} onClick={() => {window.open('https://github.com/magicblock-labss', '_blank');}}> github.com/magicblock-labs </a></div>
                    </div>
                  </div>
                );
              case 4:
                return (
                  <div className="panel" style={{display: "flex", justifyContent: 'center', alignItems:"center", height: "100%", color:"white", flexDirection:"column"}}>
                    <div>
                    <h1 style={{ margin: "2vw", marginLeft: "2vw", fontFamily: "conthrax", fontSize: "38px"}}>Get In Touch</h1>
                    <p style={{ marginLeft: "2vw", fontFamily: "terminus", fontSize: "24px"}}>
                      Interested in building or partnering with Supersize? <br />
                      Reach out to lewis@supersize.gg 
                    </p>
                    </div>
                  </div>
                );
              default:
                return null;
            }
        };
    
        setPanelContent(renderPanel(buildViewerNumber));
      }, [buildViewerNumber, newGameCreated]);

      const [inputValue, setInputValue] = useState<string>('');  
      const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          setInputValue(event.target.value);
      };
  
      const handleImageClick = async () => {
          if (inputValue.trim() !== '') {
              try {
                  const worldId = {worldId: new anchor.BN(inputValue.trim())};
                  const worldPda = await FindWorldPda( worldId);
                  const newGameInfo : ActiveGame = {worldId: worldId.worldId, worldPda: worldPda}
                  console.log('new game info', newGameInfo.worldId,newGameInfo.worldPda.toString())
                  setNewGameCreated(newGameInfo);
                  setActiveGames([newGameInfo, ...activeGames]);
              } catch (error) {
                  console.error("Invalid PublicKey:", error);
              }
          }
      };
      const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleImageClick();
        }
    };
    return (
        <div className="supersize">
        <div className="topbar" style={{display: gameId == null ? 'flex' : 'none'}}>
            {/*<img src={`${process.env.PUBLIC_URL}/supersizemaybe.png`} width="75" height="75" alt="Image"/>*/}
            {/*<h1 className="titleText"> SUPERSIZE </h1>
            <Button buttonClass="mainButton" title={"Docs"} onClickFunction={openDocs} args={[]}/>  
            <Button buttonClass="mainButton" title={"New Game"} onClickFunction={runCreatingGame} args={[]}/>  
            <Button buttonClass="mainButton" title={"New Game"} onClickFunction={newGameTxOG} args={[]}/> */} 
            {buildViewerNumber == 0 ? (<span className="free-play" style={{color:"#FFEF8A", borderColor:"#FFEF8A"}}>DEMO MODE</span>) : 
               (
                <>
               <div
                style={{
                    width: '4vh',
                    height: '4vh',
                    display: 'flex',
                    cursor: "pointer",
                    alignItems : "center", 
                    justifyContent:"center",
                    marginLeft:"2vw",
                }}
                onMouseEnter={() => setIsHovered([false,false,false,false,false,true])}
                onMouseLeave={() => setIsHovered([false,false,false,false,false,false])}
                onClick={() => setbuildViewerNumber(0)}
                >
                <img
                    src={`${process.env.PUBLIC_URL}/home.png`}
                    width="35px"
                    height="auto"
                    alt="Image"
                    style={{
                        position: "absolute",
                        opacity: isHovered[5] ? 0.2 : 0.8,
                        transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                    }}
                />
                {isHovered[5] && (
                    <img
                    src={`${process.env.PUBLIC_URL}/homehighlight.png`}
                    width="35px"
                    height="auto"
                    alt="Highlighted Image"
                    style={{
                        position: 'absolute',
                        opacity: isHovered[5] ? 0.8 : 0.2,
                        transition: 'opacity 0.3s ease',
                    }}
                    />
                )}
                </div>
                </>)
            }
            <div className="left-side" style={{display:"flex", alignItems : "center", justifyContent:"center"}}>
            <div
                style={{
                    width: '45px',
                    height: '45px',
                    position: 'relative',
                    display: 'none',
                    marginRight: '1vw',
                    alignItems : "center", 
                    justifyContent:"center",
                }}
                onMouseEnter={() => setIsHovered([false,false,false,false,false])}
                onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                >
                <img
                    src={`${process.env.PUBLIC_URL}/leaderboard.png`}
                    width="35"
                    height="35"
                    alt="Image"
                    style={{
                        position: "absolute",
                        opacity: isHovered[0] ? 0.2 : 0.8,
                        transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                    }}
                />
                {isHovered[0] && (
                    <img
                    src={`${process.env.PUBLIC_URL}/leaderboardhighlight.png`}
                    width="35"
                    height="35"
                    alt="Highlighted Image"
                    style={{
                        display: 'none',
                        position: 'absolute',
                        opacity: isHovered[0] ? 0.8 : 0.2,
                        transition: 'opacity 0.3s ease',
                    }}
                    />
                )}
            </div>
            <div className="wallet-buttons">
                <WalletMultiButton />
            </div>
            </div>
        </div>
        <>
        {!creatingGame ? (
        <>
        {buildViewerNumber==0 ? (
        <>
        <div className="game-select" style={{display: gameId == null ? 'flex' : 'none', height: '86vh'}}>
            <div className="select-background">
            <img src={`${process.env.PUBLIC_URL}/token.png`} width="30vw" height="auto" alt="Image" style={{position: 'relative', width: "30vw", height: 'auto',top:'-8vw',left:'-11vw', opacity:"0.3", 'zIndex': '-1'}}/>
            <h1 className="titleBackground"> SUPERSIZE </h1>
            </div>
            <div className="join-game">
                < div className="table">
                    <div className="playerName">
                        {String(playerKey)}
                    </div>
                    <div className="gameSelect">
                        <div className="gameSelectButton" style={{maxHeight: expandlist ?  "25vh" : "auto", height: expandlist ? "25vh" : "auto"}}>
                            <div style={{  display: "flex", flexDirection: "row", width:"100%", paddingBottom:"0.8vh", paddingTop:"0.8vh", borderBottom:"1px solid", background:"white", zIndex:"999", borderBottomLeftRadius: expandlist ? "0px" : "10px", borderBottomRightRadius: expandlist ? "0px" : "10px", borderTopLeftRadius: "10px", borderTopRightRadius:"10px", borderColor:"#5f5f5f"}}>
                            <div onClick={() => {handleClick(0);}} style={{ width: "2vw", paddingTop:"0.8vh", alignItems: 'center', justifyContent: 'center', cursor: "pointer", alignSelf:"flex-start", display:"flex", marginLeft:"1vw", fontSize: "20px", fontWeight:"700" }}>
                            {!openGameInfo[0] ? "+" : "-"}
                            </div>
                            <div className="gameInfo" style={{ marginLeft: "1vw", display: "flex", flexDirection: "column", fontSize:"1rem", paddingTop:"0.4vh", overflow:"hidden" }}>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}></span>
                                    <span>DUEL <p style={{opacity: "0.7", fontSize:"10px", display:"inline-flex"}}>[{activeGames[0].worldId.toString()}]</p></span>
                                    {openGameInfo[0] ? (
                                    <>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>[buy-in: 0] </span>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>[token: "none"]</span>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>[game size: "1500px"]</span>
                                    </>
                                    ): null}
                            </div>
                            <div style={{marginLeft: "auto", width:"2vw", height:"3vh", paddingTop:"0.8vh", alignItems:'center', justifyContent:'flex-end', marginRight:"1vw", cursor: "pointer", display:"flex"}} onClick={(e) => {setexpandlist(!expandlist); setOpenGameInfo(new Array(activeGames.length).fill(false));}}>
                            <svg width="15" height="9" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"1vw", height:'auto', transform: expandlist ? "scaleY(-1)" : "scaleY(1)", transformOrigin: 'center'}}>
                            <path d="M5 6L9.33013 0H0.669873L5 6Z" fill="black"/>
                            </svg>
                            </div>
                            </div>
                            {expandlist ? (
                            <>
                            <div className="gameInfoContainer" style={{maxHeight: expandlist ? "20vh" : "auto", height: "20vh"}}>
                            {activeGameIds.map((item, index) => (
                            <>
                            <div style={{  display: "flex", flexDirection: "row", width:"100%", paddingTop: "0.8vh",paddingBottom:!expandlist ?"0.8vh":"0.3vh", borderBottom:"1px solid", borderColor:"#5f5f5f", opacity:"0.5", cursor: "pointer"}}
                                                            onMouseEnter={(e) => {e.currentTarget.style.background = '#FFEF8A'; e.currentTarget.style.opacity = '1.0';}}
                                                            onMouseLeave={(e) => {e.currentTarget.style.background = 'white'; e.currentTarget.style.opacity = '0.5';}}>  
                            <div style={{width: "2vw", alignItems: 'center', justifyContent: 'center', cursor: "pointer", alignSelf:"flex-start", display: index == 0 ? 'flex' : 'flex' ,marginLeft: "1vw", marginTop:"0.7vh", fontSize: "20px", fontWeight:"700"}} onClick={() => {handleClick(index);}}>
                            {!openGameInfo[index] ? "+" : "-"}
                            </div>
                            <div className="gameInfo" style={{ marginLeft: "1vw", display: "flex", flexDirection: "column", fontSize:"1rem", overflow:"hidden", marginBottom:"5px", marginTop:"0.3vh"  }} 
                            onClick={()=>{                                        
                                const copiedActiveGameIds: ActiveGame[] = [...activeGames];
                                const [item] = copiedActiveGameIds.splice(index, 1);
                                copiedActiveGameIds.unshift(item);
                                setActiveGames(copiedActiveGameIds);}}>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}></span>
                                    <span>DUEL <p style={{opacity: "0.7", fontSize:"10px", display:"inline-flex"}}>[{item.toString().slice(0, 3)}]</p></span>
                                    {openGameInfo[index] ? (
                                    <>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>[buy-in: 0] </span>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>[token: "none"]</span>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>[game size: "1500px"]</span>
                                    </>
                                    ): null}
                            </div>
                            <div style={{marginLeft: "auto", width:"2vw", height:"100%", display: index == 0 ? 'flex' : 'none', alignItems:'center', justifyContent:'flex-end', marginRight:"1vw", cursor: "pointer"}}>
                            <svg width="15" height="9" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"1vw", height:'auto'}}>
                            <path d="M5 6L9.33013 0H0.669873L5 6Z" fill="black"/>
                            </svg>
                            </div>
                            </div>
                            </>
                            ))}
        
                            </div>
                            <div className="searchbox" style={{marginTop: "auto"}}>
                                <img src={`${process.env.PUBLIC_URL}/magnifying-glass.png`} width="20px" height="auto" alt="Image" style={{ marginLeft: "0.6vw", width: "1vw"}} onClick={handleImageClick} />
                                <input type="text" className="text-input" placeholder="Search by name, token, or id" style={{background:"none", border:"none",marginRight:"1vw", height:"80%"}}
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyPress}
                                >          
                                </input>
                            </div>
                            </> ) : null}
                        </div>
                    </div>
                    <div className="play">
                        <Button buttonClass="playButton" title={"Play"} onClickFunction={joinGameTx} args={[activeGames[0]]}/>
                    </div>
                </div>
            </div>
            
        </div>
        </>): (
            <div className="game-select" style={{display: gameId == null ? 'flex' : 'none', height: '86vh', alignItems: 'center', justifyContent: 'center', flexDirection:'column'}}>
                <div className="buildViewer" style={{display:"flex", alignItems: 'center', justifyContent: 'center'}}>
                    {panelContent}
                 </div>
                <div className="buildSelect">
                <div className= {buildViewerNumber==1 ? "circleOn" : "circle"} onClick={() => setbuildViewerNumber(1)}></div><div className={buildViewerNumber==2 ? "circleOn" : "circle"} onClick={() => setbuildViewerNumber(2)}></div><div className={buildViewerNumber==3 ? "circleOn" : "circle"} onClick={() => setbuildViewerNumber(3)}></div><div className={buildViewerNumber==4 ? "circleOn" : "circle"} onClick={() => setbuildViewerNumber(4)}></div>
                </div>
            </div>
        )}
        <div className="linksFooter" style={{display: gameId == null ? 'flex' : 'none', alignItems:"center",justifyContent:"center"}}>
            <div style={{height: "40px", alignItems:"center",justifyContent:"center",display:"flex", padding:"10px", marginLeft:"2vw", color:"white", fontFamily:"terminus"}}>
                <div className="tps">TPS: {currentTPS}</div>
                <div className="solprice"><img src={`${process.env.PUBLIC_URL}/solana-logo.png`} width="20px" height="auto" alt="Image" style={{ width: "1vw", marginRight: "10px"}}/> ${Math.round(price)}</div>
                {/*<div className="playercount">Active Players: 0</div>*/}
            </div>
            <div className="solstats">
                <div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        cursor: "pointer",
                        alignItems : "center", 
                        justifyContent:"center",
                        paddingLeft: "10px",
                        paddingRight:"0px",
                    }}
                    onMouseEnter={() => setIsHovered([false,true,false,false,false])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    onClick={() => setbuildViewerNumber(1)}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/build.png`}
                        width="20px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[1] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                        }}
                    />
                    {isHovered[1] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/buildhighlight.png`}
                        width="20px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[1] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                </div>
                <div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        cursor: "pointer",
                        alignItems : "center", 
                        justifyContent:"center",
                        paddingLeft: "3px",
                        paddingRight:"0px",
                    }}
                    onMouseEnter={() => setIsHovered([false,false,true,false,false])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    onClick={openDocs}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/GitBook.png`}
                        width="20px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[2] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                        }}
                    />
                    {isHovered[2] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/GitBookhighlight.png`}
                        width="20px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[2] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                </div>
                <div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        cursor: "pointer",
                        alignItems : "center", 
                        justifyContent:"center",
                        paddingLeft: "0px",
                        paddingRight:"5px",
                    }}
                    onMouseEnter={() => setIsHovered([false,false,false,true,false])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    onClick={openX}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/x-logo.png`}
                        width="15px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[3] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',

                        }}
                    />
                    {isHovered[3] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/x-logo-highlight.png`}
                        width="15px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[3] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                </div>
                <div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        alignItems : "center", 
                        justifyContent:"center",
                        borderRight: "1px solid #FFFFFF4D",
                        paddingLeft: "0px",
                        paddingRight:"10px",
                    }}
                    onMouseEnter={() => setIsHovered([false,false,false,false,false])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/discord.png`}
                        width="23px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[4] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                        }}
                    />
                    {isHovered[4] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/discordhighlight.png`}
                        width="23px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[4] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                </div>
                <div className="csupersize">© Supersize Inc. 2024</div>
            </div>
        </div>
        </>
        ) : (
            <CreateGame initFunction={newGameTx} />
        )}
        
        </>
        <div className="gameWrapper">
        <div id="status" style={{display: gameId !== null ? 'block' : 'none', zIndex: 9999}}><span className="title">Leaderboard</span></div>
        <div style={{ display: gameId !== null ? 'flex' : 'none', alignItems: 'center', position: 'fixed', top: 0, left: 0, margin: '10px', zIndex: 9999}}>
            <Button buttonClass="exitButton" title={"X"} onClickFunction={exitGameTx} args={[]}/> 
        </div>

        <div className="game" style={{display: gameId !== null ? 'block' : 'none', height: screenSize.height*scale, width: screenSize.width*scale}}>
                <GameComponent
                gameId={gameId}
                players={players}
                visibleFood={visibleFood}
                currentPlayer={currentPlayer}
                screenSize={screenSize}
                scale={scale}
            />
            {/*
            {players.map((blob, index) => (
                <PlayerEntity blob={blob} scale={scale}/>
            ))}
            {visibleFood.map((f, index) => (
                <FoodEntity food={f} scale={scale}/>
            ))}
            {currentPlayer ? 
                <PlayerEntity blob={{
                authority: currentPlayer.authority,
                x: screenSize.width / 2,
                y: screenSize.height / 2,
                radius: currentPlayer.radius,
                mass: currentPlayer.mass,
                score: currentPlayer.score,
                speed: currentPlayer.speed,
                charging: 0} as Blob}
                scale={scale}/>
            : null}
            */}
        </div>
        </div>
        {isSubmitting && (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                position: 'fixed',
                bottom: '20px',
                left: 0,
                width: '100%',
                zIndex: 1000,
            }}>
                <div className="spinner"></div>
            </div>
        )}

        {transactionError && <Alert type="error" message={transactionError} onClose={() => setTransactionError(null) } />}

        {transactionSuccess && <Alert type="success" message={transactionSuccess} onClose={() => setTransactionSuccess(null) } />}
        </div>
    );
};

export default App;