import {
  collection,
  doc,
  getDocs,
  increment,
  writeBatch,
} from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRecoilState } from 'recoil';
import {
  Community,
  CommunitySnippet,
  communityState,
} from '../atoms/communitiesAtom';
import { auth, firestore } from '../firebase/clientApp';

const useCommunityData = () => {
  const [user] = useAuthState(auth);

  const [communityStateValue, setCommunityStateValue] =
    useRecoilState(communityState);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onJoinOrLeaveCommunity = (
    communityData: Community,
    isJoined: boolean
  ) => {
    // is the user signed in?
    // if not => open auth modal
    if (isJoined) {
      leaveCommunity(useCommunityData.id);
      return;
    }
    joinCommunity(communityData);
  };

  const getMySnippets = async () => {
    setLoading(true);
    try {
      // get users snippets
      const snippetDocs = await getDocs(
        collection(firestore, `users/${user?.uid}/communitySnippets`)
      );

      const snippets = snippetDocs.docs.map((doc) => ({ ...doc.data() }));
      setCommunityStateValue((prev) => ({
        ...prev,
        mySnippets: snippets as CommunitySnippet[],
      }));

      console.log('here are snippets', snippets);
    } catch (error: any) {
      console.log('getMySnippets error', error);
      setError(error.message);
    }
    setLoading(false);
  };

  const joinCommunity = async (communityData: Community) => {
    // creating a new community snippet

    // updating the number of members on this community

    try {
      const batch = writeBatch(firestore);

      const newSnippet: CommunitySnippet = {
        communityId: communityData.id,
        imageUrl: communityData.imageUrl || '',
      };

      batch.set(
        doc(
          firestore,
          `users/${user?.uid}/communitySnippets`,
          communityData.id
        ),
        newSnippet
      );

      batch.update(doc(firestore, 'communities', communityData.id), {
        numberOfMembers: increment(1),
      });

      await batch.commit();

      setCommunityStateValue((prev) => ({
        ...prev,
        mySnippets: [...prev.mySnippets, newSnippet],
      }));
    } catch (error: any) {
      console.log('joincommunity error', error);
      setError(error.message);
    }

    setLoading(false);
  };

  const leaveCommunity = async (communityId: string) => {
    try {
      const batch = writeBatch(firestore);

      // deleting a new community snippet
      batch.delete(
        doc(firestore, `users/${user?.uid}/communitySnippets`, communityId)
      );
      // updating the number of members on this community
      batch.update(doc(firestore, 'communities', communityId), {
        numberOfMembers: increment(-1),
      });

      await batch.commit();

      // update recoil state
      setCommunityStateValue((prev) => ({
        ...prev,
        mySnippets: prev.mySnippets.filter(
          (item) => item.communityId !== communityId
        ),
      }));
    } catch (error: any) {
      console.log('leaveCOmmunity error', error);
      setError(error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    getMySnippets();
  }, [user]);

  return {
    // data and functions
    communityStateValue,
    onJoinOrLeaveCommunity,
    loading,
  };
};
export default useCommunityData;
