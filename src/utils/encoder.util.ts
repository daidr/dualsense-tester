export const utf16LEEncoder = {
    encode: (string: string) => {
        const utf16leBytes = new Uint8Array(string.length * 2);
        for (let i = 0; i < string.length; i++) {
            const codeUnit = string.charCodeAt(i);
            utf16leBytes[i * 2] = codeUnit & 0xFF;
            utf16leBytes[i * 2 + 1] = (codeUnit >> 8) & 0xFF;
        }
        return utf16leBytes;
    }
}
