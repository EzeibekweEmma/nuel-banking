import { TransactionStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class TransactionQueryDto extends PaginationDto { @IsOptional() @IsEnum(TransactionStatus) status?: TransactionStatus; }
