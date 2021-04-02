import { Container, Flex, Heading, Text, Stack, Button, useDisclosure, Modal,
    ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react';

import CreateRoomForm from './CreateRoomForm';
import JoinRoomForm from './JoinRoomForm';

const Home = () => {
    const createRoom = useDisclosure();
    const joinRoom = useDisclosure();

    return (
        <Container color='gray.700' centerContent textAlign='center'>
            <Flex position='fixed' direction='column' h='100%' align='center' justify='center'>
                <Heading fontWeight='extrabold' fontSize='6xl' letterSpacing='tighter'>
                    Guessr.App
                </Heading>
                <Text marginTop='6' fontSize='xl' opacity='0.7' maxWidth='560px'>
                    Guessr.App is a fun spotify song guessing game that lets you easily play with friends.
                </Text>
                <Stack direction='row' marginTop='6'>
                    <Button size='lg' onClick={createRoom.onOpen}>
                        Create a Room
                    </Button>
                    <Button size='lg' onClick={joinRoom.onOpen}>
                        Join a Room
                    </Button>
                </Stack>
                <Modal
                    isOpen={ createRoom.isOpen }
                    onClose={ createRoom.onClose }
                >
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>Create a Room</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody paddingBottom={6}>
                            <CreateRoomForm />
                        </ModalBody>
                    </ModalContent>
                </Modal>
                <Modal
                    isOpen={ joinRoom.isOpen }
                    onClose={ joinRoom.onClose }
                >
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>Join a Room</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody paddingBottom={6}>
                            <JoinRoomForm />
                        </ModalBody>
                    </ModalContent>
                </Modal>         
            </Flex>
        </Container>
    );
}

export default Home;