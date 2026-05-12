package com.example.curier_mobile.data.mapper

import com.example.curier_mobile.data.remote.dto.PhotoMetaDto
import com.example.curier_mobile.domain.model.Photo

fun PhotoMetaDto.toDomainModel(): Photo {
    return Photo(
        id = id,
        uploadedAt = uploadedAt,
        expiresAt = expiresAt
    )
}
