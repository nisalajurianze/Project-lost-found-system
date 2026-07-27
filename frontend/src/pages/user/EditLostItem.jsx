import React from 'react';
import { useParams } from 'react-router-dom';
import ReportItemWizard from '../../components/common/ReportItemWizard';

export const EditLostItem = () => {
  const { id } = useParams();
  return <ReportItemWizard mode="lost" itemId={id} />;
};

export default EditLostItem;
