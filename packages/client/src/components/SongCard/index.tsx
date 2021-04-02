import { Box, Text, Heading, Image, Flex } from '@chakra-ui/react';

interface SongCardProps {
    name: string;
    artists: string;
    imageUrl: string;
}

const SongCard = (props: SongCardProps) => {
    const name = props.name;
    const artists = props.artists;
    const imageUrl = props.imageUrl;

    return (
        <Box p={5} borderWidth='1px' borderRadius='lg' marginBottom={4}>
            <Flex flexDirection='row'>
                <Box boxSize="200px" marginRight={4}>
                    <Image src={imageUrl} alt={name} />
                </Box>
                <Flex flexDirection='column' justifyContent='center'>
                    <Heading fontSize="xl">{name}</Heading>
                    <Text mt={4}>{artists}</Text>
                </Flex>
            </Flex>
        </Box>
    );
}

export default SongCard;