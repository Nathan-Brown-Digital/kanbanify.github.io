import Component from '../Component.js';
import Header from '../shared/Header.js';
import Board from './Board.js';
import CardMenu from './CardMenu.js';
import MessagesContainer from './chat/MessagesContainer.js';
import ListMenu from './ListMenu.js';

import QUERY from '../utils/QUERY.js';

import { auth, boardsRef, listsByBoardRef, cardsByListRef, boardsByUserRef } from '../services/firebase.js';

class BoardApp extends Component {

    render() {
        const dom = this.renderDOM();

        const boardKey = QUERY.parse(window.location.search).key;

        const header = new Header();

        const board = new Board({});


        const messagesContainer = new MessagesContainer({ boardKey });
        dom.appendChild(messagesContainer.render());

        function onListMenuClick(list, lists, board, viewportOffset) {
            const listMenu = new ListMenu({
                list,
                board,
                viewportOffset,
                onClickAway: () => {
                    dom.removeChild(listMenuDOM);
                },
                onMoveList: (targetPosition) => {
                    lists.splice(list.position - 1, 1);
                    lists.splice(targetPosition - 1, 0, list);
                    lists.forEach((childList, i) => {
                        listsByBoardRef
                            .child(boardKey)
                            .child(childList.key)
                            .update({
                                position: i + 1
                            });
                    });
                    dom.removeChild(listMenuDOM);
                },
                onEditList: (name) => {
                    listsByBoardRef
                        .child(boardKey)
                        .child(list.key)
                        .update({
                            name
                        });
                    dom.removeChild(listMenuDOM);
                },
                onDeleteList: () => {
                    listsByBoardRef
                        .child(boardKey)
                        .child(list.key)
                        .remove();

                    cardsByListRef
                        .child(list.key)
                        .remove();

                    boardsRef
                        .child(boardKey)
                        .update({
                            listCount: lists.length - 1
                        });

                    listsByBoardRef
                        .child(boardKey)
                        .orderByChild('position')
                        .once('value', snapshot => {
                            const lists = [];
                            snapshot.forEach(childList => {
                                lists.push(childList.val());
                            });

                            lists.forEach((childList, i) => {
                                listsByBoardRef
                                    .child(boardKey)
                                    .child(childList.key)
                                    .update({
                                        position: i + 1
                                    });
                            });
                        });
                    dom.removeChild(listMenuDOM);
                }
            });

            const listMenuDOM = listMenu.render();

            const menuButtons = listMenuDOM.querySelector('.menu-buttons');

            menuButtons.style.left = viewportOffset.x + viewportOffset.width + 'px';
            menuButtons.style.top = (viewportOffset.y + 30) + 'px';

            dom.appendChild(listMenuDOM);
        }

        function onCardMenuClick(card, list, viewportOffset, lists) {
            const cardMenu = new CardMenu({
                card,
                list,
                lists,
                viewportOffset,
                onClickAway: () => {
                    dom.removeChild(cardMenuDOM);
                },
                onMoveCard: (targetList, targetPosition) => {
                    cardsByListRef
                        .child(list.key)
                        .child(card.key)
                        .remove();

                    listsByBoardRef
                        .child(boardKey)
                        .child(list.key)
                        .update({ cardCount: list.cardCount - 1 });

                    cardsByListRef
                        .child(list.key)
                        .orderByChild('position')
                        .once('value', snapshot => {
                            const cards = [];
                            snapshot.forEach(childCard => {
                                cards.push(childCard.val());
                            });

                            cards.forEach((childCard, i) => {
                                cardsByListRef
                                    .child(list.key)
                                    .child(childCard.key)
                                    .update({
                                        position: i + 1
                                    });
                            });
                        });

                    cardsByListRef
                        .child(targetList)
                        .orderByChild('position')
                        .once('value', snapshot => {
                            const cards = [];
                            snapshot.forEach(childCard => {
                                cards.push(childCard.val());
                            });
                            cards.splice(targetPosition - 1, 0, card);
                            cards.forEach((childCard, i) => {
                                cardsByListRef
                                    .child(targetList)
                                    .child(childCard.key)
                                    .set({
                                        key: childCard.key,
                                        position: i + 1,
                                        content: childCard.content
                                    });
                            });
                            listsByBoardRef
                                .child(boardKey)
                                .child(targetList)
                                .update({
                                    cardCount: cards.length
                                });

                            dom.removeChild(cardMenuDOM);
                        });

                },
                onEditCard: (content) => {
                    cardsByListRef
                        .child(list.key)
                        .child(card.key)
                        .update({ content });

                    dom.removeChild(cardMenuDOM);
                },
                onDeleteCard: () => {
                    cardsByListRef
                        .child(list.key)
                        .orderByChild('position')
                        .once('value', snapshot => {
                            const cards = [];
                            snapshot.forEach(child => {
                                if(card.key !== child.val().key) {
                                    cards.push(child.val());
                                } else {
                                    cardsByListRef.child(list.key).child(card.key).remove();
                                }
                            });
                            cards.forEach((updatedCard, i) => {
                                cardsByListRef.child(list.key).child(updatedCard.key).update({
                                    position: i + 1
                                });
                            });
                            dom.removeChild(cardMenuDOM);
                        });
                    listsByBoardRef.child(boardKey).child(list.key).update({
                        cardCount: list.cardCount - 1
                    });
                }
            });

            const cardMenuDOM = cardMenu.render();

            const menuButtons = cardMenuDOM.querySelector('.menu-buttons');

            menuButtons.style.left = viewportOffset.x + 10 + viewportOffset.width + 'px';
            menuButtons.style.top = viewportOffset.y + 'px';

            dom.appendChild(cardMenuDOM);
        }

        boardsByUserRef
            .child(auth.currentUser.uid)
            .once('value', snapshot => {
                const value = snapshot.val();
                const boards = value ? Object.keys(value) : [];
                if(!boards.includes(boardKey)) {
                    window.location = './';
                }
            })
            .then(() => {
                boardsRef.child(boardKey).on('value', snapshot => {
                    const boardInfo = snapshot.val();
                    listsByBoardRef.child(boardInfo.key).orderByChild('position').on('value', snapshot => {
                        const lists = [];
                        snapshot.forEach(child => {
                            lists.push(child.val());
                        });
                        board.update({ board: boardInfo, lists, onCardMenuClick, onListMenuClick });
                    });
                });
            });



        dom.prepend(header.render());
        dom.appendChild(board.render());

        return dom;
    }

    renderTemplate() {
        return /*html*/`
            <div>
            </div>
        `;
    }
}

export default BoardApp;