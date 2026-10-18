import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Error as MongooseError } from 'mongoose';

/** Перетворює помилки Mongo/Mongoose на зрозумілі 400/409 замість 500. */
@Catch(MongooseError.ValidationError, MongooseError.CastError, Error)
export class MongoExceptionFilter implements ExceptionFilter {
  catch(err: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (err?.getStatus) {
      return res.status(err.getStatus()).json(err.getResponse());
    }
    if (err?.code === 11000) {
      return res.status(HttpStatus.CONFLICT).json({ message: 'Такий запис вже існує', keys: err.keyValue });
    }
    if (err instanceof MongooseError.ValidationError || err instanceof MongooseError.CastError) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: err.message });
    }
    console.error(err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
  }
}
