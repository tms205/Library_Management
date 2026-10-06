package com.librarymanagement.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.librarymanagement.entity.Account;

//repository này quản lý entity account
public interface AccountRepository extends JpaRepository<Account, Long> {

	// tìm account theo field email
	Optional<Account> findByEmail(String email);

	// kiểm tra xem email đã tồn tại chưa
	boolean existsByEmail(String email);
}
