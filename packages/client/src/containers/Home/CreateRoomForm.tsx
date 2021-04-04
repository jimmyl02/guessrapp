import React from 'react';
import { useHistory } from 'react-router-dom';
import { Flex, Button, FormControl, FormLabel, FormErrorMessage, Input, useToast } from '@chakra-ui/react';
import { Formik, Form, Field, FormikHelpers } from 'formik';

import { API_URL } from '../../config';

export interface CreateRoomValues {
    roomId: string;
    playlistUrl: string;
    numRounds: number;
    roundLength: number;
    replayLength: number;
}

const CreateRoomForm = () => {
    const history = useHistory();
    const toast = useToast();

    const handleSubmit = async (values: CreateRoomValues, actions: FormikHelpers<CreateRoomValues>) => {
        // First process creating the playlist
        const createPlaylistRequest = await fetch(API_URL + '/api/playlists/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: await JSON.stringify({ playlist_url: values.playlistUrl })
        });
        const parsedCreatePlaylistRequest = await createPlaylistRequest.json();
        if(!parsedCreatePlaylistRequest.status || parsedCreatePlaylistRequest.status !== 'success'){
            toast({
                title: 'Error creating playlist',
                description: parsedCreatePlaylistRequest.data,
                position: 'top-right',
                status: 'error',
                isClosable: true,
              })
            actions.setSubmitting(false);
            return;
        }

        // Playlist has been created, now create the room
        const createRoomRequest = await fetch(API_URL + '/api/rooms/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: await JSON.stringify({ roomId: values.roomId, playlistUrl: values.playlistUrl, numRounds: Number(values.numRounds),
                roundLength: Number(values.roundLength), replayLength: Number(values.replayLength) })
        });
        const parsedCreateRoomRequest = await createRoomRequest.json();
        if(parsedCreateRoomRequest.status && parsedCreateRoomRequest.status === 'success'){
            history.push('/room/' + values.roomId);
        }else{
            toast({
                title: 'Error creating room',
                description: parsedCreateRoomRequest.data,
                position: 'top-right',
                status: 'error',
                isClosable: true,
              });
            actions.setSubmitting(false);
        }
    };

    const validateNonNull = (value: string) => {
        let error;
        if(!value){
            error = 'This field is required';
        }
        return error;
    };

    const validateLimits = (min: number, max: number) => {
        const validateFunc = (value: string) => {
            let error;
            const inpNum = Number(value);
            if(typeof inpNum !== 'number' && !inpNum){
                error = 'This field is required';
            } else if (inpNum < min || inpNum > max) {
                error = 'Must be between ' + min + ' and ' + max;
            }
            return error;
        }
        return validateFunc;
    }

    return (
        <Formik<CreateRoomValues>
        initialValues={{ 
            roomId: '',
            playlistUrl: '',
            numRounds: 5,
            roundLength: 25,
            replayLength: 10
            }}
        onSubmit={handleSubmit}
        >
        {props => (
            <Form>
                <Field name='roomId' validate={validateNonNull}>
                    {/*
                        // @ts-expect-error */}
                    {({ field, form }) => ( 
                    <FormControl isInvalid={form.errors.roomId && form.touched.roomId}>
                        <FormLabel htmlFor='roomId'>Room Name</FormLabel>
                        <Input {...field} id='roomId' placeholder='Room Name' color='black' />
                        <FormErrorMessage>{form.errors.roomId}</FormErrorMessage>
                    </FormControl>
                    )}
                </Field>
                <Field name='playlistUrl' validate={validateNonNull}>
                    {/*
                        // @ts-expect-error */}
                    {({ field, form }) => ( 
                    <FormControl marginTop='2' isInvalid={form.errors.playlistUrl && form.touched.playlistUrl}>
                        <FormLabel htmlFor='playlistUrl'>Spotify Playlist URL</FormLabel>
                        <Input {...field} id='playlistUrl' placeholder='Spotify Playlist URL' color='black' />
                        <FormErrorMessage>{form.errors.playlistUrl}</FormErrorMessage>
                    </FormControl>
                    )}
                </Field>
                <Field name='numRounds' validate={validateLimits(1, 30)}>
                    {/*
                        // @ts-expect-error */}
                    {({ field, form }) => ( 
                    <FormControl marginTop='2' isInvalid={form.errors.numRounds && form.touched.numRounds}>
                        <FormLabel htmlFor='numRounds'>Number of Rounds</FormLabel>
                        <Input {...field} id='numRounds' placeholder='5' color='black' />
                        <FormErrorMessage>{form.errors.numRounds}</FormErrorMessage>
                    </FormControl>
                    )}
                </Field>
                <Field name='roundLength' validate={validateLimits(5, 30)}>
                    {/*
                        // @ts-expect-error */}
                    {({ field, form }) => ( 
                    <FormControl marginTop='2' isInvalid={form.errors.roundLength && form.touched.roundLength}>
                        <FormLabel htmlFor='roundLength'>Length of Round (seconds)</FormLabel>
                        <Input {...field} id='roundLength' placeholder='25' color='black' />
                        <FormErrorMessage>{form.errors.roundLength}</FormErrorMessage>
                    </FormControl>
                    )}
                </Field>
                <Field name='replayLength' validate={validateLimits(0, 25)}>
                    {/*
                        // @ts-expect-error */}
                    {({ field, form }) => ( 
                    <FormControl marginTop='2' isInvalid={form.errors.replayLength && form.touched.replayLength}>
                        <FormLabel htmlFor='replayLength'>Length of Song Replay (seconds)</FormLabel>
                        <Input {...field} id='replayLength' placeholder='Room Id' color='black' />
                        <FormErrorMessage>{form.errors.replayLength}</FormErrorMessage>
                    </FormControl>
                    )}
                </Field>
                <Flex float='right'>
                    <Button marginTop='4' colorScheme="blue" isLoading={props.isSubmitting} type="submit">
                        Create Room
                    </Button>
                </Flex>
            </Form>
        )}
        </Formik>
    );
}

export default CreateRoomForm;