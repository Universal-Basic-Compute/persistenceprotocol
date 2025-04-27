import React from 'react';

interface ImageUploadProps {
  images: string[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  images, 
  onUpload, 
  onRemove, 
  disabled = false 
}) => {
  return (
    <div className="image-upload-container">
      <label className="image-upload-button" title="Upload images">
        📷
        <input
          type="file"
          className="image-upload-input"
          accept="image/*"
          multiple
          onChange={onUpload}
          disabled={disabled}
        />
      </label>
      {images.map((imageData, index) => (
        <div key={`img-${index}`} className="image-preview-container">
          <img src={imageData} alt="Preview" className="image-preview" />
          <button 
            className="remove-image-button"
            onClick={() => onRemove(index)}
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ImageUpload;
