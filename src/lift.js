import axios from 'axios'
const baseUrl = process.env.LIFT_API;

export async function initiateRegistration() {
    try {
        var result = await axios.post(`${baseUrl}/voters/init`)
        return result.data;
    }catch(err){
        return err
    }
}

export async function getVoterById(voterId) {
    try {
        var result = await axios.post(`${baseUrl}/voters/${voterId}`)
        return result.data;
    }catch(err){
        return err
    }
}