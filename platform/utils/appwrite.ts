import { Client, Account, Databases } from 'appwrite';

const client = new Client();

client
    .setEndpoint('http://api.suguna.co/v1')
    .setProject('suguna-console');

export const account = new Account(client);
export const databases = new Databases(client);

export default client;
