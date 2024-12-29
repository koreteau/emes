export const loginUser = async (username, password) => {
    const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        throw new Error("Failed to login");
    }

    const { token } = await response.json();
    return token;
};
