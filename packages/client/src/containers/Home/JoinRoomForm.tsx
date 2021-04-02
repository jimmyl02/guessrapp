import React from 'react';
import { useHistory } from 'react-router-dom';
import { Flex, Button, FormControl, FormLabel, FormErrorMessage, Input, useToast } from '@chakra-ui/react';
import { Formik, Form, Field, FormikHelpers } from 'formik';

import { API_URL } from '../../config';

export interface JoinRoomValues {
    roomId: string;
}

const JoinRoomForm = () => {
    const history = useHistory();
    const toast = useToast();

    const handleSubmit = async (values: JoinRoomValues, actions: FormikHelpers<JoinRoomValues>) => {
        // First process creating the playlist
        const roomExistsRequest = await fetch(API_URL + '/api/rooms/exists', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: await JSON.stringify({ roomId: values.roomId })
        });
        const parsedRoomExistsRequest = await roomExistsRequest.json();
        if(parsedRoomExistsRequest.status && parsedRoomExistsRequest.status === 'success'){
            if (parsedRoomExistsRequest.data) {
                history.push('/room/' + values.roomId);
            } else {
                toast({
                    title: 'Room does not exist',
                    description: 'Room not found, make sure you entered the correct name',
                    position: 'top-right',
                    status: 'error',
                    isClosable: true,
                  });
            }
        } else {
            toast({
                title: 'Something went wrong',
                description: 'We couldn\'t reach our servers, please try again',
                position: 'top-right',
                status: 'error',
                isClosable: true,
              });
            actions.setSubmitting(false);
            return;
        }
    };

    const validateNonNull = (value: string) => {
        let error;
        if(!value){
            error = 'This field is required';
        }
        return error;
    };

    return (
        <Formik<JoinRoomValues>
        initialValues={{ 
            roomId: ''
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
                <Flex float='right'>
                    <Button marginTop='4' colorScheme="blue" isLoading={props.isSubmitting} type="submit">
                        Join Room
                    </Button>
                </Flex>
            </Form>
        )}
        </Formik>
    );
}

export default JoinRoomForm;