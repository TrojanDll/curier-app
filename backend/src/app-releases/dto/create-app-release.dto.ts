import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Метаданные релиза, приходящие вместе с APK как multipart text-поля.
 * Сам файл — отдельно в @UploadedFile('apk'); сюда попадают только текстовые
 * поля, поэтому числа/булевы приходят строками и приводятся @Type/@Transform
 * (глобальный ValidationPipe работает с enableImplicitConversion: false).
 */
export class CreateAppReleaseDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  versionCode!: number;

  @IsString()
  @MaxLength(32)
  versionName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  releaseNotes?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  gitCommit?: string;
}
