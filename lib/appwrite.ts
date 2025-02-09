import { Account, Avatars, Client, OAuthProvider } from 'react-native-appwrite';
import * as Linking from 'expo-linking'
import { openAuthSessionAsync } from 'expo-web-browser';

export const config ={
     platform:'com.jsm.restate',
     endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
     projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
}

// create new client
export const client = new Client();

client
    .setEndpoint(config.endpoint!)
    .setProject(config.projectId!)
    .setPlatform(config.platform)

//to create avatars using initials

export const avatar = new Avatars(client);
export const account = new Account(client);

//to redirect after authentication to app
export async function login(){
    try {
        const redirectUri = Linking.createURL('/');
        // to request oauth token from google
        const response = await account.createOAuth2Token(OAuthProvider.Google,redirectUri)
        if(!response) throw new Error('Failed to Login');
        //if the auth responds or gives token we start a browser session
        const browserResult = await openAuthSessionAsync(
            response.toString(),
            redirectUri
        )
        if(browserResult.type != 'success') throw new Error('Failed to login retry');

        const url = new URL(browserResult.url);

        const secret = url.searchParams.get('secret')?.toString();
        const userId = url.searchParams.get('userId')?.toString();

        if(!secret || !userId) throw new Error ( 'Failed to Login');

        const session = await account.createSession(userId,secret);

        if(!session) throw new Error('Failed to create a session');
       
        return true;
    }
     catch(error){

     }
}
export async function logout() {
    try{
        await account.deleteSession('current');
        return true;

    }
    catch(error){
        console.error(error);
        return false;
    }
}
//togetuserdata
export async function getCurrentUser(){
    try{
        const response = await account.get();
        if(response.$id){
            const userAvatar = avatar.getInitials(response.name);
            return{
                ...response,
                avatar: userAvatar.toString(),
            }
        }
    }
    catch(error){
        console.error(error);
        return null;
    }
}