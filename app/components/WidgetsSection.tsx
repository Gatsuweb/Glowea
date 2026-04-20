import styles from './WidgetsSection.module.css';
import WidgetButton from './WidgetButton';

export default function WidgetsSection() {
  // Produits fictifs (Onglerie & Cils)
  const products = [
    { id: 1, name: "Cils Volume Russe 0.05D", stock: 14, color: "#FCD7D1" },
    { id: 2, name: "Colle Extra Forte", stock: 3, color: "#F5C3BC" },
    { id: 3, name: "Base Rubber Gel", stock: 8, color: "#FCD7D1" },
  ];

  return (
    <section className={styles.container}>
      {/* Grand Widget Supérieur */}
      <WidgetButton className={`${styles.card} ${styles.bannerWidget}`}>
        <span className={styles.plusIcon}>+</span>
      </WidgetButton>

      <div className={styles.bottomRow}>
        {/* Carte Mon Stock */}
        <div className={`${styles.card} ${styles.stockCard}`}>
          <h2 className={styles.cardTitle}>Mon stock</h2>
          
          <div className={styles.productsList}>
            {products.map((product) => (
              <div key={product.id} className={styles.productItem}>
                {/* Représente le carré pastel de la maquette */}
                <div 
                  className={styles.productImage} 
                  style={{ backgroundColor: product.color }}
                ></div>
                <div className={styles.productInfo}>
                  <p className={styles.productName}>{product.name}</p>
                  <p className={`${styles.productStock} ${product.stock < 5 ? styles.lowStock : ''}`}>
                    {product.stock} en stock
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Petit Widget Inférieur Droit */}
        <WidgetButton className={`${styles.card} ${styles.addWidget}`}>
          <span className={styles.plusIcon}>+</span>
        </WidgetButton>
      </div>
    </section>
  );
}
