// Storage handling module
export const storage = {
    get: (key) => localStorage.getItem(key),
    set: (key, value) => localStorage.setItem(key, value)
};
