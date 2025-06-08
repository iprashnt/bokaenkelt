import cron from "node-cron"
import Booking from "../models/booking.model.js";
import { sendEmail } from "../config/mailer.js"

export const scheduleAppointmentReminders = async () => {
    cron.schedule('0 * * * *', async () => {
        const now = new Date();
        const reminderTime = new Date(now.getTime() + 12 * 60 * 60 * 1000);

        const bookings = await Booking.find({}).populate('customer');;

        for (const booking of bookings) {
            const appointmentDateTime = new Date(`${booking.date}T${booking.time}:00`);

            const timeDiff = Math.abs(appointmentDateTime - reminderTime);
            const diffInMinutes = timeDiff / (1000 * 60);

            if (diffInMinutes <= 5) {
                await sendEmail(booking.email, `${booking.date} at ${booking.time}`);
            }
        }
    });
};
