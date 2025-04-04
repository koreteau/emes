import { useState } from "react";
import { Typography, Input, Button } from "@material-tailwind/react";
import { loginUser } from "../utils/auth";

export function Login({ onLogin }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async () => {
        try {
            const token = await loginUser(username, password);
            localStorage.setItem("authToken", token); // Sauvegarde le token
            onLogin(); // Notifie App.js que l'utilisateur est connecté
        } catch (err) {
            setError("Invalid username or password");
        }
    };

    return (
        <div className="grid grid-cols-2 h-screen">
            <div className="bg-primary flex flex-col items-center justify-center">
                <Typography className="text-5xl" color="white">SYNAPS.</Typography>
                <Typography className="text-xs" color="white">Enterprise Management Ecosystem</Typography>
            </div>
            <div className="flex flex-col items-center justify-center">
                <div className="rounded-lg shadow-2xl p-5 w-96 flex flex-col items-center justify-center gap-4">
                    <div className="bg-red-500 text-white px-2 py-1 rounded">
                        PRODUCTION
                    </div>
                    <hr />
                    <Input label="Username" size="lg" color="secondary" value={username} onChange={(e) => setUsername(e.target.value)} />
                    <Input label="Password" size="lg" color="secondary" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <Button variant="primary" fullWidth className="bg-primary" onClick={handleLogin}>Log in</Button>
                    {error && <Typography className="text-xs text-red-500">{error}</Typography>}
                    <Typography className="text-xs" color="secondary">Problem logging in? Please contact your system administrator</Typography>
                </div>
            </div>
        </div>
    );
}