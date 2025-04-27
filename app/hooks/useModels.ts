import { useState } from 'react';
import { Model } from '../types';
import { AVAILABLE_MODELS } from '../api/config';

export function useModels() {
  const [models, setModels] = useState<Model[]>(AVAILABLE_MODELS);

  const toggleModel = (modelId: string) => {
    setModels(prevModels => 
      prevModels.map(model => 
        model.id === modelId 
          ? { ...model, selected: !model.selected } 
          : model
      )
    );
  };

  return { models, setModels, toggleModel };
}
