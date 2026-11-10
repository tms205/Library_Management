package com.librarymanagement.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.librarymanagement.entity.DeviceToken;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

	Optional<DeviceToken> findByToken(String token);

	List<DeviceToken> findByAccount_IdIn(Collection<Long> accountIds);

	List<DeviceToken> findByAccount_Id(Long accountId);

	@Modifying
	@Query("DELETE FROM DeviceToken dt WHERE dt.token = :token")
	int deleteByToken(@Param("token") String token);

	@Modifying
	@Query("DELETE FROM DeviceToken dt WHERE dt.account.id = :accountId AND dt.token = :token")
	int deleteByAccount_IdAndToken(@Param("accountId") Long accountId, @Param("token") String token);
}
