package com.librarymanagement.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.EmailChangeRequest;

public interface EmailChangeRequestRepository extends JpaRepository<EmailChangeRequest, Long> {

	Optional<EmailChangeRequest> findByAccount(Account account);
}
