"use client";

import React from 'react';
import Image from 'next/image';
import styles from './InstallAppModal.module.css';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>

        <div className={styles.header}>
          <Image src="/logo.svg" alt="Glowea" className={styles.logo} width={120} height={40} />
          <h2 className={styles.title}>Installer Glowea sur votre ecran d&apos;accueil</h2>
          <p className={styles.subtitle}>Accédez à Glowea comme une vraie application, en un clic.</p>
        </div>

        <div className={styles.instructionsGrid}>
          {/* iPhone / Safari */}
          <div className={styles.deviceCard}>
            <div className={styles.deviceHeader}>
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke="currentColor"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"></path> </g></svg>
              Sur iPhone (Safari)
            </div>
            <div className={styles.deviceBody}>
              <div className={styles.stepRow}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepText}>Ouvrez Glowea dans Safari</div>
                <div className={styles.stepIcon}>
                  <svg width="24" height="24" viewBox="0 0 48 48" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>Safari-color</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Icons" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd"> <g id="Color-" transform="translate(-700.000000, -1043.000000)"> <g id="Safari" transform="translate(700.000000, 1043.000000)"> <circle id="Oval" fill="#00ABFF" cx="24" cy="24" r="24"> </circle> <g id="Group" transform="translate(24.388909, 24.176777) rotate(-45.000000) translate(-24.388909, -24.176777) translate(2.888909, 20.676777)"> <g id="Group-2" transform="translate(0.000000, 0.000000)"> <polygon id="Shape" fill="#FFFFFF" points="-3.19744231e-13 3.1 21.35 6.2 22.2921646 0.731192283"> </polygon> <polygon id="Shape" fill="#EE0000" points="42.7 3.1 21.35 6.2 21.35 2.4901204"> </polygon> <polygon id="Shape" fill="#FFFFFF" points="0 3.1 21.35 0 21.35 3.1"> </polygon> <polygon id="Shape" fill="#EE0000" points="21.35 -1.59872116e-13 42.7 3.1 21.35 3.1"> </polygon> </g> </g> </g> </g> </g> </g></svg>
                </div>
              </div>
              <div className={styles.stepRow}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepText}>Touchez l&apos;icone Partager</div>
                <div className={styles.stepIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C79C9C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                </div>
              </div>
              <div className={styles.stepRow}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepText}>
                  Sélectionnez
                  <span className={styles.stepTextHighlight}>Ajouter a l&apos;ecran d&apos;accueil</span>
                </div>
                <div className={styles.stepIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C79C9C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Android / Chrome */}
          <div className={styles.deviceCard}>
            <div className={styles.deviceHeader}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" stroke="currentColor"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M18.06 9.33002C17.8107 9.33002 17.5716 9.42905 17.3953 9.60534C17.219 9.78162 17.12 10.0207 17.12 10.27V14.53C17.12 14.7793 17.219 15.0184 17.3953 15.1947C17.5716 15.371 17.8107 15.47 18.06 15.47C18.3093 15.47 18.5484 15.371 18.7247 15.1947C18.901 15.0184 19 14.7793 19 14.53V10.27C19 10.0207 18.901 9.78162 18.7247 9.60534C18.5484 9.42905 18.3093 9.33002 18.06 9.33002Z" fill="currentColor"></path> <path d="M5.94 9.33002C5.6907 9.33002 5.4516 9.42905 5.27532 9.60534C5.09904 9.78162 5 10.0207 5 10.27V14.53C5 14.7793 5.09904 15.0184 5.27532 15.1947C5.4516 15.371 5.6907 15.47 5.94 15.47C6.1893 15.47 6.4284 15.371 6.60468 15.1947C6.78096 15.0184 6.88 14.7793 6.88 14.53V10.27C6.88 10.0207 6.78096 9.78162 6.60468 9.60534C6.4284 9.42905 6.1893 9.33002 5.94 9.33002Z" fill="currentColor"></path> <path d="M7.56 9.33002V15.73C7.56 15.8705 7.58767 16.0097 7.64145 16.1395C7.69522 16.2693 7.77403 16.3873 7.87339 16.4866C7.97275 16.586 8.09071 16.6648 8.22053 16.7186C8.35034 16.7723 8.48948 16.8 8.63 16.8H9.31V19.07C9.31 19.3193 9.40903 19.5584 9.58532 19.7347C9.7616 19.911 10.0007 20.01 10.25 20.01C10.4993 20.01 10.7384 19.911 10.9147 19.7347C11.091 19.5584 11.19 19.3193 11.19 19.07V16.8H12.81V19.07C12.81 19.3193 12.909 19.5584 13.0853 19.7347C13.2616 19.911 13.5007 20.01 13.75 20.01C13.9993 20.01 14.2384 19.911 14.4147 19.7347C14.591 19.5584 14.69 19.3193 14.69 19.07V16.8H15.37C15.6538 16.8 15.9259 16.6873 16.1266 16.4866C16.3273 16.286 16.44 16.0138 16.44 15.73V9.33002H7.56Z" fill="currentColor"></path> <path d="M16.32 8.00002C16.0257 7.01263 15.373 6.17089 14.49 5.64002L14.34 5.55002L14.18 5.47002L14.36 5.16002L14.89 4.16002C14.9 4.13153 14.9006 4.10055 14.8916 4.07171C14.8826 4.04288 14.8645 4.01773 14.84 4.00002H14.77C14.7445 4.00117 14.7195 4.00805 14.697 4.02017C14.6745 4.03229 14.655 4.04933 14.64 4.07002L14.1 5.00002L13.93 5.31002L13.77 5.24002L13.6 5.18002C12.5637 4.82036 11.4363 4.82036 10.4 5.18002L10.24 5.24002L10.07 5.31002L9.9 5.00002L9.36 4.00002C9.3508 3.98361 9.33847 3.96916 9.32369 3.95752C9.30892 3.94587 9.292 3.93724 9.27389 3.93214C9.25578 3.92703 9.23684 3.92554 9.21816 3.92775C9.19948 3.92996 9.18141 3.93583 9.165 3.94502C9.14858 3.95422 9.13414 3.96655 9.12249 3.98133C9.11084 3.9961 9.10222 4.01303 9.09711 4.03113C9.09201 4.04924 9.09051 4.06818 9.09273 4.08686C9.09494 4.10554 9.1008 4.12361 9.11 4.14002L9.64 5.14002L9.82 5.45002L9.66 5.53002L9.51 5.62002C8.62277 6.15307 7.97197 7.00413 7.69 8.00002C7.61195 8.25988 7.56825 8.52883 7.56 8.80002H16.44C16.4302 8.5297 16.3899 8.26133 16.32 8.00002ZM10 7.47002C9.92089 7.47002 9.84355 7.44656 9.77777 7.40261C9.71199 7.35866 9.66072 7.29619 9.63045 7.2231C9.60017 7.15001 9.59225 7.06958 9.60768 6.99199C9.62312 6.91439 9.66121 6.84312 9.71715 6.78718C9.7731 6.73124 9.84437 6.69314 9.92196 6.67771C9.99955 6.66228 10.08 6.6702 10.1531 6.70047C10.2262 6.73075 10.2886 6.78202 10.3326 6.8478C10.3765 6.91358 10.4 6.99091 10.4 7.07002C10.4 7.17611 10.3579 7.27785 10.2828 7.35287C10.2078 7.42788 10.1061 7.47002 10 7.47002ZM14 7.47002C13.9209 7.47002 13.8435 7.44656 13.7778 7.40261C13.712 7.35866 13.6607 7.29619 13.6304 7.2231C13.6002 7.15001 13.5922 7.06958 13.6077 6.99199C13.6231 6.91439 13.6612 6.84312 13.7172 6.78718C13.7731 6.73124 13.8444 6.69314 13.922 6.67771C13.9996 6.66228 14.08 6.6702 14.1531 6.70047C14.2262 6.73075 14.2886 6.78202 14.3326 6.8478C14.3765 6.91358 14.4 6.99091 14.4 7.07002C14.4 7.17611 14.3579 7.27785 14.2828 7.35287C14.2078 7.42788 14.1061 7.47002 14 7.47002Z" fill="currentColor"></path> </g></svg>
              Sur Android (Chrome)
            </div>
            <div className={styles.deviceBody}>
              <div className={styles.stepRow}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepText}>Ouvrez Glowea dans Chrome</div>
                <div className={styles.stepIcon}>
                  <svg width="24" height="24" version="1.1" id="_x36_" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xmlSpace="preserve" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <path style={{fill:"#D24441"}} d="M480.759,133.469H275.417c-6.339-1.029-12.85-1.541-19.446-1.541 c-68.533,0-124.045,55.512-124.045,124.045c0,25.784,7.796,49.685,21.246,69.56L10.537,182.896C42.062,77.1,139.978,0,255.971,0 c52.085,0,100.486,15.592,140.921,42.319c28.869,19.103,53.627,43.776,72.645,72.645 C473.563,120.96,477.246,127.129,480.759,133.469z"></path> <path style={{fill:"#4CB566"}} d="M325.532,358.771L182.897,501.405c-20.217-5.996-39.406-14.477-57.225-25.102 c-37.094-21.929-68.105-52.941-90.035-90.033C12.935,348.063,0,303.601,0,255.972c0-25.359,3.684-49.858,10.537-73.076 l142.634,142.636c22.273,32.896,60.052,54.568,102.799,54.568C281.756,380.1,305.657,372.219,325.532,358.771z"></path> <path style={{fill:"#D5CB44"}} d="M275.395,133.442c59.299,9.325,104.657,60.639,104.657,122.557 c0,42.759-21.63,80.462-54.543,102.775L182.888,501.396c23.16,6.887,47.686,10.603,73.083,10.603c141.385,0,256-114.615,256-256 c0-44.4-11.309-86.158-31.195-122.557H275.395z"></path> <path style={{fill:"#FFFFFF"}} d="M275.417,133.469c-6.339-1.029-12.85-1.541-19.446-1.541c-68.533,0-124.045,55.512-124.045,124.045 c0,25.784,7.796,49.685,21.246,69.56c22.273,32.896,60.052,54.568,102.799,54.568c25.785,0,49.686-7.881,69.561-21.329 c32.896-22.274,54.484-60.054,54.484-102.799C380.015,194.119,334.697,142.805,275.417,133.469z M255.971,356.542 c-55.426,0-100.573-45.058-100.573-100.57c0-55.428,45.146-100.574,100.573-100.574c55.426,0,100.572,45.146,100.572,100.574 C356.543,311.483,311.396,356.542,255.971,356.542z"></path> <path style={{fill:"#5991CD"}} d="M155.399,256.001c0,55.454,45.117,100.571,100.571,100.571s100.571-45.117,100.571-100.571 S311.424,155.43,255.97,155.43S155.399,200.547,155.399,256.001z"></path> </g> <path style={{fill:"none"}} d="M255.971,155.398c-55.426,0-100.573,45.146-100.573,100.574c0,0,0.001,0.012,0.001,0.021 c0.005-55.451,45.12-100.564,100.571-100.564c27.731,0,52.876,11.283,71.087,29.498l0.005-0.004 C308.846,166.694,283.695,155.398,255.971,155.398z"></path> <path style={{fill:"none"}} d="M380.015,255.972c0,27.352-8.871,52.646-23.856,73.17c15.004-20.513,23.893-45.78,23.893-73.143 c0-34.26-13.929-65.235-36.383-87.684l-0.019,0.019C366.094,190.781,380.015,221.743,380.015,255.972z"></path> <path style={{fill:"none"}} d="M356.541,256.001c0,3.459-0.177,6.879-0.519,10.248c0.344-3.38,0.521-6.808,0.521-10.277 c0-27.704-11.278-52.837-29.48-71.049l-0.005,0.004C345.265,203.137,356.541,228.279,356.541,256.001z"></path> <path style={{opacity:0.06, fill:"#040000"}} d="M480.744,133.441c-3.509-6.329-7.187-12.49-11.207-18.478 c-9.496-14.414-20.425-27.783-32.581-39.934l-93.286,93.285c22.453,22.45,36.383,53.424,36.383,87.684 c0,27.363-8.889,52.63-23.893,73.143c14.985-20.523,23.856-45.818,23.856-73.17c0-34.229-13.921-65.191-36.364-87.639 l-16.588,16.59c18.202,18.212,29.48,43.345,29.48,71.049c0,3.47-0.177,6.898-0.521,10.277c0.342-3.369,0.519-6.789,0.519-10.248 c0-27.722-11.277-52.864-29.484-71.074L74.991,436.994c15.125,15.121,32.144,28.35,50.681,39.309 c17.819,10.625,37.008,19.105,57.225,25.102l0.005-0.004C206.059,508.284,230.579,512,255.971,512 c141.385,0,255.999-114.616,255.999-256.001c0-44.4-11.309-86.158-31.195-122.557H480.744z"></path> </g> </g></svg>
                </div>
              </div>
              <div className={styles.stepRow}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepText}>Touchez le menu</div>
                <div className={styles.stepIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                </div>
              </div>
              <div className={styles.stepRow}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepText}>
                  Sélectionnez
                  <span className={styles.stepTextHighlight}>Ajouter a l&apos;ecran d&apos;accueil</span>
                </div>
                <div className={styles.stepIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C79C9C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.successBox}>
          <div className={styles.appIcon}>G</div>
          <div className={styles.successText}>
            <h3>C&apos;est prêt !</h3>
            <p>Retrouvez Glowea sur votre ecran d&apos;accueil.</p>
          </div>
          <div className={styles.heartIcon}>
            <svg viewBox="0 0 24 24" fill="#F8B4B4" stroke="none">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        </div>

        <button className={styles.actionButton} onClick={onClose}>
          J&apos;ai compris
        </button>
      </div>
    </div>
  );
}
