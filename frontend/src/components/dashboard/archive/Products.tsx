import React, { FC } from 'react';

interface Product {
  name: string;
  description: string;
  stage: 'Concept' | 'Development' | 'Beta' | 'Live';
}

interface ProductsProps {
  products: Product[];
}

const Products: FC<ProductsProps> = ({ products }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md mt-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Products & Services</h3>
      <div className="space-y-4">
        {products.map((product, index) => (
          <div key={index} className="p-4 border rounded-md">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-lg text-gray-700">{product.name}</h4>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                product.stage === 'Live' ? 'bg-green-100 text-green-800' :
                product.stage === 'Beta' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {product.stage}
              </span>
            </div>
            <p className="text-gray-600 mt-2">{product.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Products;
