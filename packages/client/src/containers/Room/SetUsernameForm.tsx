import React from 'react';
import { Flex, Button, FormControl, FormLabel, FormErrorMessage, Input } from '@chakra-ui/react';
import { Formik, Form, Field, FormikHelpers } from 'formik';

interface SetUsernameFormProps {
    setUsername: React.Dispatch<React.SetStateAction<string>>;
}

export interface SetUsernameValues {
    username: string;
}

const SetUsernameForm = (props: SetUsernameFormProps) => {
    const setUsername = props.setUsername;

    const handleSubmit = async (values: SetUsernameValues, actions: FormikHelpers<SetUsernameValues>) => {
        setUsername(values.username);
    };

    const validateNonNull = (value: string) => {
        let error;
        if(!value){
            error = 'This field is required';
        }
        return error;
    };

    return (
        <Formik<SetUsernameValues>
        initialValues={{ 
            username: ''
            }}
        onSubmit={handleSubmit}
        >
        {props => (
            <Form>
                <Field name='username' validate={validateNonNull}>
                    {/*
                        // @ts-expect-error */}
                    {({ field, form }) => ( 
                    <FormControl isInvalid={form.errors.username && form.touched.username}>
                        <FormLabel htmlFor='username'>Username</FormLabel>
                        <Input {...field} id='username' placeholder='Username' color='black' />
                        <FormErrorMessage>{form.errors.username}</FormErrorMessage>
                    </FormControl>
                    )}
                </Field>
                <Flex float='right'>
                    <Button marginTop='4' colorScheme="blue" isLoading={props.isSubmitting} type="submit">
                        Set Username
                    </Button>
                </Flex>
            </Form>
        )}
        </Formik>
    );
}

export default SetUsernameForm;