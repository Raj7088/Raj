import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, BeforeInsert, getManager } from 'typeorm'
import { User } from './User'
import { Room } from './Room'
import { BaseEntity } from './BaseEntity'
import * as moment from 'moment'

@Entity()
export class Booking extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'booking_id' })
  public booking_id: number

  @Column({ name: 'booking_start', type: 'datetime', nullable: false })
  public bookingStart: Date

  @Column({ name: 'booking_end', type: 'datetime', nullable: false })
  public bookingEnd: Date

  @Column({ name: 'title', type: 'varchar' })
  public title: string

  @Column({ name: 'purpose', type: 'varchar' })
  public purpose: string

  @ManyToOne(type => User, user => user.bookings)
  user: User

  @ManyToOne(type => Room, room => room.bookings)
  room: Room

  public clashesWithExisting(
    existingBookingStart: number,
    existingBookingEnd: number,
    newBookingStart: number,
    newBookingEnd: number,
  ) {
    if (
      (newBookingStart >= existingBookingStart && newBookingStart < existingBookingEnd) ||
      (existingBookingStart >= newBookingStart && existingBookingStart < newBookingEnd)
    ) {
      throw new Error(
        `Booking could not be saved. There is a clash with an existing booking from ${moment(
          existingBookingStart,
        ).format('HH:mm')} to ${moment(existingBookingEnd).format('HH:mm on LL')}`,
      )
    }
    return false
  }

  @BeforeInsert()
  public async isValidBooking() {
    // Extract the room_id
    const roomId = this.room.room_id

    // Convert booking Date objects into a number value
    const newBookingStart = this.bookingStart.getTime()
    const newBookingEnd = this.bookingEnd.getTime()

    const existingBookings = await getManager()
      .getRepository(Room)
      .findOne({
        relations: ['room'],
        where: { room: { room_id: roomId } },
      })

    if (existingBookings && existingBookings.bookings) {
      const bookingClash = existingBookings.bookings
        .map(booking => {
          // Convert existing booking Date objects into number values
          const existingBookingStart = new Date(booking.bookingStart).getTime()
          const existingBookingEnd = new Date(booking.bookingEnd).getTime()

          return this.clashesWithExisting(existingBookingStart, existingBookingEnd, newBookingStart, newBookingEnd)
        })
        .every(Boolean)

      // Ensure the new booking is valid - the booking is for a future time)
      const validAppointment = newBookingStart < newBookingEnd && newBookingStart > new Date().getTime()

      return !bookingClash && validAppointment
    }

    return true
  }
}
