//Lib
import { promises as fs } from 'fs';
import path from 'path';
import { authOptions } from '../auth/[...nextauth]';
import { getServerSession } from 'next-auth/next';

export default async function handler(req, res) {
    if (req.method == 'PUT') {
        //Verify that the user is logged in.
        const session = await getServerSession(req, res, authOptions);
        if (!session) {
            res.status(401).json({ message: 'You must be logged in.' });
            return;
        }

        //The data we expect to receive
        let { appriseMode, appriseStatelessURL } = req.body;

        //Read the users file
        //Find the absolute path of the json directory
        const jsonDirectory = path.join(process.cwd(), '/config');
        let usersList = await fs.readFile(
            jsonDirectory + '/users.json',
            'utf8'
        );
        //Parse the usersList
        usersList = JSON.parse(usersList);

        //1 : control the data
        if (appriseMode != 'package' && appriseMode != 'stateless') {
            res.status(422).json({ message: 'Unexpected data' });
            return;
        }

        //2 : Verify that the user of the session exists
        const userIndex = usersList
            .map((user) => user.username)
            .indexOf(session.user.name);
        if (userIndex === -1) {
            res.status(400).json({
                message:
                    'User is incorrect. Please, logout to update your session.',
            });
            return;
        }

        //3 : Change the appriseMode
        try {
            //Modify the appriseMode for the user
            let newUsersList = usersList.map((user) =>
                user.username == session.user.name
                    ? {
                          ...user,
                          appriseMode: appriseMode,
                          appriseStatelessURL: appriseStatelessURL,
                      }
                    : user
            );
            //Stringify the new users list
            newUsersList = JSON.stringify(newUsersList);
            //Write the new JSON
            fs.writeFile(jsonDirectory + '/users.json', newUsersList, (err) => {
                if (err) console.log(err);
            });
            res.status(200).json({ message: 'Successful API send' });
        } catch (error) {
            //Log for backend
            console.log(error);
            //Log for frontend
            if (error.code == 'ENOENT') {
                res.status(500).json({
                    status: 500,
                    message: 'No such file or directory',
                });
            } else {
                res.status(500).json({
                    status: 500,
                    message: 'API error, contact the administrator',
                });
            }
            return;
        }
    } else {
        res.status(405).json({ message: 'Bad request on API' });
    }
}
