import {} from '../core/common.js'

export async function startCNode(network, options) {
    const cardanoNodeOptions = [
        '--port', options.port,
        '--database-path', options.dbPath,
        '--socket-path', socketPath,
        '--config', configFile,
        '--topology', topolgoyFile
    ]

    cnode = spawn(
        path.resolve('.', cardanoPath, process.platform, 'cardano-node'), 
    ['run',...cardanoNodeOptions])

    cnode.stdout.on('data', (data) => {
        console.info(`cnode: ${data}`);
    });

    cnode.stderr.on('data', (data) => {
        console.error(`cnode err: ${data}`);
    });

    return cnode;
}