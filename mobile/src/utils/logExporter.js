import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function downloadBookingLogs(bookingData) {
    try {
        const logsData = {
            bookingId: bookingData.bookingId,
            service: bookingData.service,
            provider: bookingData.provider,
            status: bookingData.status,
            date: bookingData.date,
            rating: bookingData.rating,
            startTime: bookingData.startTime,
            endTime: bookingData.endTime,
            timestamp: new Date().toISOString(),
            meta: bookingData.meta,
        };

        const jsonString = JSON.stringify(logsData, null, 2);
        const fileName = `booking_${bookingData.bookingId}_logs.json`;
        const filePath = `${FileSystem.documentDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(filePath, jsonString);

        // On web, this will trigger download. On native, shows share sheet
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(filePath, {
                mimeType: 'application/json',
                dialogTitle: 'Download Booking Logs',
            });
        } else {
            console.log('Sharing not available, file saved to:', filePath);
        }

        return { success: true, filePath };
    } catch (error) {
        console.error('Error downloading logs:', error);
        return { success: false, error: error.message };
    }
}
