package com.librarymanagement.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.librarymanagement.entity.Member;

public interface MemberRepository extends JpaRepository<Member, Long>,
		JpaSpecificationExecutor<Member> {

	@Override
	@EntityGraph(attributePaths = { "account" })
	List<Member> findAll();

	@Override
	@EntityGraph(attributePaths = { "account" })
	Optional<Member> findById(Long id);

	@Override
	@EntityGraph(attributePaths = { "account" })
	Page<Member> findAll(Specification<Member> spec, Pageable pageable);

	@EntityGraph(attributePaths = { "account" })
	Optional<Member> findByAccount_Email(String email);

	@EntityGraph(attributePaths = { "account" })
	Optional<Member> findByAccount_Id(Long accountId);

	boolean existsByAccount_Id(Long accountId);
}
