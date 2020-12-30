const fs = require('fs');
const path = require("path")
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

const isDevelopment = process.env.NODE_ENV !== 'production'

const cardanoPath = isDevelopment 
    ? path.resolve(__dirname, '..', 'cardano') 
    : path.resolve(__dirname, '..', '..', 'cardano');
const liftDbPath = path.resolve(cardanoPath, 'lift-db');

// you would have to import / invoke this in another file
async function openDb () {
  return open({
    filename: path.resolve(liftDbPath, 'lift.db'),
    driver: sqlite3.Database
  })
}

export async function setupLiftDb() {
    try {
        if (!fs.existsSync(path.resolve(liftDbPath, 'lift.db'))) {
            fs.mkdirSync(liftDbPath);
            const db = await openDb();
            await db.exec('CREATE TABLE voters (voterId TEXT, walletId TEXT, confirmed INTEGER)')
        }
    } catch(err) {
        console.error(err)
    }
}

export async function addVoter(voterId, walletId, confirmation) {
    try
    {
        const db = await openDb();
        await db.run('INSERT INTO voters(voterId, walletId, confirmed) VALUES (:voterId, :walletId, :confirmed)', {
            ':voterId': voterId,
            ':walletId': walletId,
            ':confirmed': confirmation
          })
    }catch(err) {
        console.error(err);
    }
}

export async function updateVoterStatus(voterId, confirmation) {
    try
    {
        const db = await openDb();
        await db.run('UPDATE voters SET confirmed = :confirmed where voterId = :voterId', {
            ':voterId': voterId,
            ':confirmed': confirmation
          })
    }catch(err) {
        console.error(err);
    }
}

export async function getAllVoters() {
    try
    {
        const db = await openDb();
        return await db.all('SELECT voterId, walletId, confirmed FROM voters')
    }catch(err) {
        console.error(err);
    }
}

export async function getVoterById(voterId) {
    try
    {
        const db = await openDb();
        return await db.get('SELECT voterId, walletId, confirmed FROM voters WHERE voterId = :voterId', {
            ':voterId': voterId
        })
    }catch(err) {
        console.error(err);
    }
}

