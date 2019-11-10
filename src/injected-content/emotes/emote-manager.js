export function mapEmoteSizeToClass(size) {
    switch (size) {
        case 24:
            return 'twentyfour';
        case 30:
            return 'thirty';
        case 50:
        default:
            return 'fifty';
    }
}
