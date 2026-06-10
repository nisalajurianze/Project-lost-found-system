// ============================================
// My Claims Page Component
// Lists ownership claim requests submitted by student
// ============================================

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClaims } from '../../redux/slices/claimSlice';
import ClaimCard from '../../components/cards/ClaimCard';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';

export const MyClaims = () => {
  const dispatch = useDispatch();
  const { claims, pagination, isLoading } = useSelector((state) => state.claims);

  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchClaims({ page, limit: 9 }));
  }, [dispatch, page]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-3xl font-extrabold font-display text-surface-900 dark:text-white">
          My Ownership Claims
        </h1>
        <p className="page-subtitle text-sm text-surface-500 dark:text-surface-400 mt-1">
          Monitor status approvals for claim requests submitted by you
        </p>
      </div>

      {isLoading && claims.length === 0 ? (
        <Loader fullPage />
      ) : claims.length === 0 ? (
        <EmptyState
          title="No claims filed yet"
          description="Submit claim requests for found property by clicking the claim button on verified matches."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {claims.map((claim) => (
              <ClaimCard key={claim._id} claim={claim} />
            ))}
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPrevPage}
            onPageChange={(nextPage) => setPage(nextPage)}
          />
        </>
      )}

    </div>
  );
};

export default MyClaims;
