package com.librarymanagement.specification;

import java.time.LocalDate;

import org.springframework.data.jpa.domain.Specification;

import com.librarymanagement.entity.BorrowRecord;
import com.librarymanagement.entity.Member;

public class MemberSpecification {

	public static Specification<Member> hasFullName(String fullName) {

		return (root, query, cb) -> {
			if (fullName == null || fullName.isBlank()) {
				return cb.conjunction();
			}
			return cb.like(cb.lower(root.get("fullName")), "%" + fullName.toLowerCase() + "%");
		};
	}

	public static Specification<Member> hasPhone(String phone) {

		return (root, query, cb) -> {

			if (phone == null || phone.isBlank()) {
				return cb.conjunction();
			}

			return cb.like(root.get("phone"), "%" + phone + "%");
		};
	}

	public static Specification<Member> hasAddress(String address) {

		return (root, query, cb) -> {

			if (address == null || address.isBlank()) {
				return cb.conjunction();
			}

			return cb.like(cb.lower(root.get("address")), "%" + address.toLowerCase() + "%");
		};
	}

	public static Specification<Member> hasDateOfBirthBetween(LocalDate fromDate, LocalDate toDate) {
		return (root, query, cb) -> {
			if (fromDate == null && toDate == null) {
				return cb.conjunction();
			}

			if (fromDate != null && toDate != null) {
				return cb.between(root.get("dateOfBirth"), fromDate, toDate);
			}

			if (fromDate != null) {
				return cb.greaterThanOrEqualTo(root.get("dateOfBirth"), fromDate);
			}

			return cb.lessThanOrEqualTo(root.get("dateOfBirth"), toDate);
		};
	}

	// tim nguoi theo sach da tung muon
	public static Specification<Member> hasBorrowedBook(Long bookId) {
		return (root, query, cb) -> {

			if (bookId == null) {
				return cb.conjunction();
			}

			var subquery = query.subquery(Long.class);
			var borrowRoot = subquery.from(BorrowRecord.class);

			subquery.select(//
					borrowRoot.get("member").get("id")//
			);

			subquery.where(//
					cb.equal(//
							borrowRoot.get("book").get("id"), //
							bookId//
			));

			return root.get("id").in(subquery);
		};
	}
}
