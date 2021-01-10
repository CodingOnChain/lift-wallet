import fs from 'fs'
import util from 'util';
import path from 'path';
import { exec } from 'child_process'

const cmd = util.promisify(exec);
const isDevelopment = process.env.NODE_ENV !== 'production'

export async function cli(statement) {
    return await cmd(statement)
}