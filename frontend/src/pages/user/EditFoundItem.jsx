import React from 'react';
import { useParams } from 'react-router-dom';
import ReportItemWizard from '../../components/common/ReportItemWizard';

export const EditFoundItem = () => {
  const { id } = useParams();
  return <ReportItemWizard mode="found" itemId={id} />;
};

export default EditFoundItem;
