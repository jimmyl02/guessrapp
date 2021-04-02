import { useEffect, useRef, useState, useCallback } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Box, useToast, useDisclosure, Modal, ModalOverlay, ModalContent,
    ModalHeader, ModalBody, Grid, GridItem, Flex, Center, Stack, Text, Heading,
    Button, Input, Container } from '@chakra-ui/react';
import SetUsernameForm from './SetUsernameForm';
import AudioSpectrum from 'react-audio-spectrum';

import SongCard from '../../components/SongCard';

import { WEBSOCKET_URL } from '../../config';

interface QueryParams {
    id: string;
}

interface ScoreTracker {
    [username: string]: number;
}

interface Message {
    info: boolean;
    username?: string;
    text: string;
}

interface SongInfo {
    name: string;
    artists: string;
    imageUrl: string;
}

const Home = () => {
    const queryParams: QueryParams = useParams();
    const toast = useToast();
    const history = useHistory();

    const setUsernameModal = useDisclosure({ defaultIsOpen: true });

    const roomId = queryParams.id;
    const webSocket = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [username, setUsername] = useState('');
    const [totalScores, setTotalScores] = useState<ScoreTracker>({});
    const [roundScores, setRoundScores] = useState<ScoreTracker>({});

    const [gameStatus, setGameStatus] = useState(0);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageValue, setMessageValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [disabledStartGame, setDisabledStartGame] = useState(false);
    const [displaySongCard, setDisplaySongCard] = useState(false);
    const [songInfo, setSongInfo] = useState<SongInfo | {}>({});
    const audioElem = useRef<HTMLAudioElement | null>(null);

    const startGame = (): void => {
        setDisabledStartGame(true);
        safeWebSocketSend(JSON.stringify({type: 'startGame'}));
    }

    const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement>): void => setMessageValue(event.target.value);
    const handleMessageSubmit = (): void => {
        safeWebSocketSend(JSON.stringify({type: 'sendMessage', data: messageValue}));
        setMessageValue('');
    }
    const scrollToBottomMessage = (): void => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }

    useEffect(() => {
        scrollToBottomMessage()
      }, [messages]);

    const safeWebSocketSend = (message: string): void => {
        if (isConnected && webSocket.current) {
            webSocket.current.send(message);
        } else {
            toast({
                title: 'Connection not ready',
                description: 'Not yet connected to game server, try again in a bit',
                position: 'top-right',
                status: 'error',
                isClosable: true,
              });
        }
    }

    const handleWebSocketMessage = useCallback((message: string): void => {
        let parsed;
        try {
            parsed = JSON.parse(message);
        } catch {
            console.log('[!] Failed to parse incoming WS message');
        }

        const status = parsed['status'];
        let data = parsed['data'];

        if (status === 'success') {
            const type = data['type'];
            data = data['data'];

            switch (type) {
                case 'joinedRoom': {
                    // close username modal
                    setUsernameModal.onClose();
                
                    const connectedUsersData = data['connectedUsers'];
                    const gameStatus = Number(data['gameStatus']);
                    setGameStatus(gameStatus);

                    if (gameStatus === 0) {
                        // we are in lobby
                        const initialTotalScore: ScoreTracker = {};
                        for (const username of connectedUsersData) {
                            initialTotalScore[username] = 0;
                        }
                        setTotalScores(initialTotalScore);
                    } else {
                        // already ingame
                        setDisabledStartGame(true);
                        // TODO: Handle joining mid game
                    }
                    break;
                }
                case 'roundStart': {
                    setDisplaySongCard(false);
                    setRoundScores({});
                    setDisabledStartGame(true);

                    setTotalScores((oldInitialTotalScore) => {
                        const clearedTotalScores: ScoreTracker = {};
                        for (const username of Object.keys(oldInitialTotalScore)) {
                            clearedTotalScores[username] = 0;
                        }
                        return clearedTotalScores;
                    });

                    if (audioElem.current) {
                        audioElem.current.src = data;
                        audioElem.current.play();
                    }
                    break;
                }
                case 'roundOver': {
                    if (audioElem.current) {
                        audioElem.current.pause();
                    }
                    const newSongInfo: SongInfo = {
                        name: data['name'],
                        artists: data['artists'],
                        imageUrl: data['image_url']
                    }
                    setSongInfo(newSongInfo);
                    setDisplaySongCard(true);
                    break;
                }
                case 'scoreInfo': {
                    const targetUsername = data['username'];
                    const roundScore = data['score'];

                    setRoundScores((oldRoundScores) => ({...oldRoundScores, [targetUsername]: roundScore}));
                    setTotalScores((oldTotalScores) => ({...oldTotalScores, [targetUsername]: Number(roundScore) + Number(oldTotalScores[targetUsername])}));
                    break;
                }
                case 'gameOver': {
                    setGameStatus(0);
                    setDisabledStartGame(false);
                    break;
                }
                case 'renderMessage': {
                    if (data.info) {
                        const newMessage: Message = {
                            info: true,
                            text: data.text
                        }
                        setMessages(oldMessages => [...oldMessages, newMessage]);
                    } else {
                        const newMessage: Message = {
                            info: false,
                            username: data.username,
                            text: data.text
                        }
                        setMessages(oldMessages => [...oldMessages, newMessage]);
                    }
                    break;
                }
            }
        } else {
            if (data === 'room does not exist') {
                if (webSocket.current) {
                    webSocket.current.onclose = () => { // get rid of disconnected toast for wrong room
                        setIsConnected(false);
                    }
                }
                history.push('/');
            } else {
                toast({
                    title: 'Something went wrong',
                    description: data,
                    position: 'top-right',
                    status: 'error',
                    isClosable: true,
                    });
            }
        }
    }, [history, toast]); // purposefully ignore setUsernameModal

    useEffect(() => {
        webSocket.current = new WebSocket(WEBSOCKET_URL);

        webSocket.current.onclose = () => {
            setIsConnected(false);
            toast({
                title: 'Disconnected from game server',
                description: 'Connection was closed, please refresh the page',
                position: 'top-right',
                status: 'error',
                isClosable: true,
                });
        };

        webSocket.current.onopen = () => {
            setIsConnected(true);
        }

        webSocket.current.onmessage = (e) => {
            console.log(e.data); // DEBUG: Here for debugging, remove in final build
            handleWebSocketMessage(e.data);
        }

        return () => {
            if (!webSocket.current) return;
            webSocket.current.close(); // use the ! to tell ts compiler to assert current willbe non-null
        };
    }, [toast, handleWebSocketMessage]);

    useEffect(() => {
        if (isConnected && webSocket.current && username) {
            webSocket.current.send(JSON.stringify({ type: 'joinRoom', data: { roomId: roomId, username: username } }));
        }
    }, [isConnected, roomId, username]);

    return (
        <Box color='gray.700'>
            <audio id="audioSpectrumTarget"
                ref={audioElem}
                style={{display: 'none'}}
                src=''
                crossOrigin='annonymous'
                >
            </audio>
            <Grid
                maxWidth='8xl'
                height='100vh'
                margin='auto'
                templateRows="repeat(12, 1fr)"
                templateColumns="repeat(12, 1fr)"
                gap={4}
                >
                <GridItem colSpan={3} rowStart={2} rowEnd={12} minWidth='0'>
                    <Flex flexDirection='column' height='100%' borderWidth='1px' borderRadius='lg' position='relative'>
                        <Heading size='md' marginTop={3} marginLeft={4} marginBottom={4}>Total Scores</Heading>
                        <Box overflow='auto'>
                            <Stack>
                                {Object.keys(totalScores).map((username: string) => {
                                    return (
                                        <Box key={username} marginBottom={4}>
                                            <Text marginLeft={4} display='inline-block' float='left'
                                                overflow='hidden' textOverflow='ellipsis' maxWidth='70%'
                                                whiteSpace='nowrap'>{username}</Text>
                                            <Text marginRight={4} display='inline-block' float='right'>{totalScores[username]}</Text>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Box>
                        <Button size='md' width='100%' alignSelf='flex-end' minHeight={10} 
                            onClick={() => startGame()} isDisabled={disabledStartGame}>Start Game</Button>
                    </Flex>
                </GridItem>
                <GridItem colSpan={6} rowStart={2} rowEnd={12} bg="">
                    <Box height='100%' borderWidth='1px' borderRadius='lg' overflow='auto'>
                        <Box overflow='auto'>
                            <Container marginTop={4} marginBottom={4}>
                                {displaySongCard && <SongCard name={(songInfo as SongInfo).name} artists={(songInfo as SongInfo).artists} imageUrl={(songInfo as SongInfo).imageUrl} />}
                                <Stack>
                                    {Object.keys(roundScores).map((username: string) => {
                                        return (
                                            <Box key={username} marginBottom={4}>
                                                <Text marginLeft={4} display='inline-block' float='left'
                                                    overflow='hidden' textOverflow='ellipsis' maxWidth='70%'
                                                    whiteSpace='nowrap' size='md'>{username}</Text>
                                                <Text marginRight={4} display='inline-block' float='right' size='md'>+{roundScores[username]}</Text>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            </Container>
                        </Box>
                    </Box>
                </GridItem>
                <GridItem minHeight='200px' colSpan={3} rowStart={2} rowEnd={12}>
                    <Flex direction='column' height='100%'>
                        <Box borderWidth='1px' borderRadius='lg' overflow='auto' flex='0 0 auto'>
                            <Center>
                                <AudioSpectrum
                                    id="audioSpectrumCanvas"
                                    height={200}
                                    width={300}
                                    audioId='audioSpectrumTarget'
                                    capColor={'red'}
                                    capHeight={2}
                                    meterWidth={2}
                                    meterCount={512}
                                    meterColor={[
                                        {stop: 0, color: '#f00'},
                                        {stop: 0.5, color: '#0CD7FD'},
                                        {stop: 1, color: 'red'}
                                    ]}
                                    gap={4}
                                    />
                            </Center>
                        </Box>
                        <Box marginTop={4} borderWidth='1px' borderRadius='lg' flex='0 0 auto' position='relative' height='calc(100% - 218px)'>
                            <Heading size='md' marginTop={3} marginLeft={4} marginBottom={4}>Messages</Heading>
                            <Box overflow='auto' height='calc(100% - 100px)'>
                                <Stack>
                                    {messages.map((message: Message, idx: number) => {
                                        if (message.info) {
                                            return (
                                                <Box key={idx}>
                                                    <Text marginLeft={4} display='inline-block' float='left' color='blue.300' wordBreak='break-all'>{message.text}</Text>
                                                </Box>
                                            );
                                        } else {
                                            return (
                                                <Box key={idx}>
                                                    <Text marginLeft={4} display='inline-block' float='left' wordBreak='break-all'>{message.username}: {message.text}</Text>
                                                </Box>
                                            );
                                        }
                                    })}
                                    <div ref={messagesEndRef} />
                                </Stack>
                            </Box>
                            <Input size='md' width='100%' bottom='0' minHeight={10} position='absolute'
                                value={messageValue} placeholder='Message' onChange={handleMessageChange}
                                onKeyPress={event => {
                                    if (event.key === 'Enter') {
                                        handleMessageSubmit();
                                    }
                                  }}></Input>
                        </Box>
                    </Flex>
                </GridItem>
            </Grid>
            <Modal
                isOpen={ setUsernameModal.isOpen }
                onClose={ () => {} }
            >
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Set Your Username</ModalHeader>
                    <ModalBody paddingBottom={6}>
                        <SetUsernameForm setUsername={setUsername} />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}

export default Home;