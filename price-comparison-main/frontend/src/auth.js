import API from "./api";

export const login = async (username, password) => {
  const response = await API.post(
    "login/",
    {
      username: username,
      password: password,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};
