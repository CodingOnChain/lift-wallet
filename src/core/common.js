import fs from 'fs'
import util from 'util';
import crypto from 'crypto';
import { exec } from 'child_process'

const cmd = util.promisify(exec);

export async function cli(statement) {
    return await cmd(statement)
}

export function encrypt(prvFile, pubFile, password) {
    try {
        const algorithm = "aes-192-cbc";
        const prvData = fs.readFileSync(prvFile);
        const pubData = fs.readFileSync(pubFile);

        const key = crypto.scryptSync(password, pubData.slice(16, 32), 24); //create key
        
        const cipher = crypto.createCipheriv(algorithm, key, pubData.slice(0, 16));
        var encrypted = cipher.update(prvData.toString(), 'utf8', 'hex') + cipher.final('hex'); // encrypted text
        fs.writeFileSync(prvFile, encrypted);
    } catch (exception) {
        throw exception.message;
    }
}

export function decrypt(prvFile, pubFile, password) {
    try {
        const algorithm = "aes-192-cbc";
        const prvData = fs.readFileSync(prvFile);
        const pubData = fs.readFileSync(pubFile);

        const key = crypto.scryptSync(password, pubData.slice(16, 32), 24); //create key

        const decipher = crypto.createDecipheriv(algorithm, key, pubData.slice(0, 16));
        const decrypted = decipher.update(prvData.toString(), 'hex', 'utf8') + decipher.final('utf8'); //deciphered text
        fs.writeFileSync(prvFile, decrypted);
    } catch (exception) {
        throw exception.message;
    }
}